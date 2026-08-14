<?php

declare(strict_types=1);

use App\Actions\ShoppingListItemComment\AddItemCommentAction;
use App\Actions\ShoppingListItemComment\DeleteItemCommentAction;
use App\Data\ShoppingListItemCommentData;
use App\Data\SyncChangeData;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\ShoppingListItemComment;
use App\Models\User;
use App\Services\Sync\SyncPullService;
use App\Services\Sync\SyncPushService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

/*
 * Smoke-тесты доменного слоя треда комментариев (DEV). Полноценное
 * feature-покрытие (HTTP, конфликты LWW, пагинация) — задача TEST.
 */

beforeEach(function (): void {
    $this->user = User::factory()->create(['name' => 'Алексей']);
    $this->list = ShoppingList::factory()->for($this->user)->create(['type' => 'tasks']);
    $this->item = ShoppingListItem::factory()->forList($this->list)->create();
});

it('adds a comment with denormalized author name and owner', function (): void {
    $comment = app(AddItemCommentAction::class)(
        $this->item,
        $this->user,
        new ShoppingListItemCommentData(body: 'Первый комментарий'),
    );

    expect($comment->exists)->toBeTrue()
        ->and($comment->uuid)->not->toBeEmpty()
        ->and($comment->author_name)->toBe('Алексей')
        ->and($comment->body)->toBe('Первый комментарий')
        ->and($comment->user_id)->toBe($this->item->user_id)
        ->and($comment->server_revision)->toBeGreaterThan(0)
        ->and($comment->created_at)->not->toBeNull()
        ->and($this->item->comments()->count())->toBe(1);
});

it('respects client uuid on offline-created comment', function (): void {
    $uuid = (string) Str::uuid();

    $comment = app(AddItemCommentAction::class)(
        $this->item,
        $this->user,
        new ShoppingListItemCommentData(body: 'Offline', uuid: $uuid),
    );

    expect($comment->uuid)->toBe($uuid);
});

it('soft deletes a comment and bumps server_revision (tombstone)', function (): void {
    $comment = ShoppingListItemComment::factory()->forItem($this->item)->create();
    $revisionBefore = $comment->server_revision;

    app(DeleteItemCommentAction::class)($comment);

    $trashed = ShoppingListItemComment::withTrashed()->findOrFail($comment->id);
    expect($trashed->deleted_at)->not->toBeNull()
        ->and($trashed->server_revision)->toBeGreaterThan($revisionBefore);
});

it('authorizes view/delete only for the owner', function (): void {
    $comment = ShoppingListItemComment::factory()->forItem($this->item)->create();
    $stranger = User::factory()->create();

    expect($this->user->can('view', $comment))->toBeTrue()
        ->and($this->user->can('delete', $comment))->toBeTrue()
        ->and($stranger->can('view', $comment))->toBeFalse()
        ->and($stranger->can('delete', $comment))->toBeFalse();
});

it('serializes comments in sync pull with parent item uuid', function (): void {
    $comment = ShoppingListItemComment::factory()->forItem($this->item)->create();

    $result = app(SyncPullService::class)->pull($this->user, since: 0);

    $rows = $result['shopping_list_item_comments'];
    expect($rows)->toHaveCount(1)
        ->and($rows[0]['uuid'])->toBe($comment->uuid)
        ->and($rows[0]['shopping_list_item_uuid'])->toBe($this->item->uuid)
        ->and($rows[0]['author_name'])->toBe($comment->author_name)
        ->and($rows[0]['body'])->toBe($comment->body)
        ->and($rows[0])->not->toHaveKeys(['id', 'user_id', 'server_revision']);
});

it('creates a comment from sync push resolving parent by public uuid', function (): void {
    $uuid = (string) Str::uuid();

    $result = app(SyncPushService::class)->push($this->user, [
        new SyncChangeData(
            entityType: 'shopping_list_item_comment',
            uuid: $uuid,
            operation: 'create',
            payload: [
                'shopping_list_item_uuid' => $this->item->uuid,
                'author_name' => 'Алексей',
                'body' => 'С клиента',
            ],
            updatedAt: CarbonImmutable::parse('2026-08-14T10:00:00Z'),
        ),
    ]);

    expect($result->applied)->toBe([$uuid]);

    $comment = ShoppingListItemComment::where('uuid', $uuid)->firstOrFail();
    expect($comment->shopping_list_item_id)->toBe($this->item->id)
        ->and($comment->user_id)->toBe($this->user->id)
        ->and($comment->body)->toBe('С клиента');
});
