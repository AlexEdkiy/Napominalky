<?php

declare(strict_types=1);

use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\ShoppingListItemComment;
use App\Models\User;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

/*
 * HTTP-контракт треда комментариев строки задачи (docs/07-api.md):
 * GET/POST /shopping-lists/{list}/items/{item}/comments и
 * DELETE .../comments/{comment}. Доменный слой покрыт smoke-тестами DEV
 * (ItemCommentDomainSmokeTest) — здесь только HTTP-уровень.
 */

beforeEach(function (): void {
    $this->user = User::factory()->create(['name' => 'Мария']);
    $this->list = ShoppingList::factory()->for($this->user)->create(['type' => 'tasks']);
    $this->item = ShoppingListItem::factory()->forList($this->list)->create();
    $this->base = "/api/v1/shopping-lists/{$this->list->uuid}/items/{$this->item->uuid}/comments";
});

// ---------------------------------------------------------------------------
// POST — создание комментария
// ---------------------------------------------------------------------------

it('creates a comment with 201 and the public resource contract', function (): void {
    Sanctum::actingAs($this->user);

    $response = $this->postJson($this->base, ['body' => 'Первый комментарий'])
        ->assertCreated()
        ->assertJsonStructure(['data' => ['uuid', 'author_name', 'body', 'created_at']])
        ->assertJsonPath('data.author_name', 'Мария')
        ->assertJsonPath('data.body', 'Первый комментарий')
        ->assertJsonMissingPath('data.id')
        ->assertJsonMissingPath('data.user_id')
        ->assertJsonMissingPath('data.shopping_list_item_id')
        ->assertJsonMissingPath('data.server_revision');

    $comment = ShoppingListItemComment::where('uuid', $response->json('data.uuid'))->firstOrFail();
    expect($comment->shopping_list_item_id)->toBe($this->item->id)
        ->and($comment->user_id)->toBe($this->item->user_id)
        ->and($comment->created_at)->not->toBeNull();
});

it('echoes a client-provided uuid on comment store', function (): void {
    Sanctum::actingAs($this->user);

    $uuid = (string) Str::uuid();

    $this->postJson($this->base, ['uuid' => $uuid, 'body' => 'Offline-создан'])
        ->assertCreated()
        ->assertJsonPath('data.uuid', $uuid);

    expect(ShoppingListItemComment::where('uuid', $uuid)->exists())->toBeTrue();
});

it('rejects a duplicate client uuid with 422', function (): void {
    Sanctum::actingAs($this->user);

    $existing = ShoppingListItemComment::factory()->forItem($this->item)->create();

    $this->postJson($this->base, ['uuid' => $existing->uuid, 'body' => 'Дубликат'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['uuid']);
});

it('rejects a comment without a body with 422', function (): void {
    Sanctum::actingAs($this->user);

    $this->postJson($this->base, [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['body']);
});

it('rejects a body longer than 2000 characters with 422 and accepts exactly 2000', function (): void {
    Sanctum::actingAs($this->user);

    $this->postJson($this->base, ['body' => str_repeat('a', 2001)])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['body']);

    $this->postJson($this->base, ['body' => str_repeat('a', 2000)])
        ->assertCreated();
});

// ---------------------------------------------------------------------------
// GET — тред в хронологическом порядке
// ---------------------------------------------------------------------------

it('lists the thread in chronological (ASC) order regardless of insertion order', function (): void {
    Sanctum::actingAs($this->user);

    $late = ShoppingListItemComment::factory()->forItem($this->item)->create([
        'body' => 'Поздний',
        'created_at' => '2026-06-03T10:00:00Z',
    ]);
    $early = ShoppingListItemComment::factory()->forItem($this->item)->create([
        'body' => 'Ранний',
        'created_at' => '2026-06-01T10:00:00Z',
    ]);
    $middle = ShoppingListItemComment::factory()->forItem($this->item)->create([
        'body' => 'Средний',
        'created_at' => '2026-06-02T10:00:00Z',
    ]);

    $response = $this->getJson($this->base)
        ->assertOk()
        ->assertJsonCount(3, 'data');

    expect(array_column($response->json('data'), 'uuid'))
        ->toBe([$early->uuid, $middle->uuid, $late->uuid]);
});

it('excludes soft-deleted comments from the thread', function (): void {
    Sanctum::actingAs($this->user);

    $alive = ShoppingListItemComment::factory()->forItem($this->item)->create();
    ShoppingListItemComment::factory()->forItem($this->item)->trashed()->create();

    $response = $this->getJson($this->base)
        ->assertOk()
        ->assertJsonCount(1, 'data');

    expect($response->json('data.0.uuid'))->toBe($alive->uuid);
});

// ---------------------------------------------------------------------------
// DELETE — удаление (tombstone)
// ---------------------------------------------------------------------------

it('deletes a comment with 204 leaving a tombstone', function (): void {
    Sanctum::actingAs($this->user);

    $comment = ShoppingListItemComment::factory()->forItem($this->item)->create();

    $this->deleteJson("{$this->base}/{$comment->uuid}")->assertNoContent();

    expect(ShoppingListItemComment::find($comment->id))->toBeNull()
        ->and(ShoppingListItemComment::withTrashed()->findOrFail($comment->id)->deleted_at)
        ->not->toBeNull();
});

it('returns 404 when deleting an already deleted comment', function (): void {
    Sanctum::actingAs($this->user);

    $comment = ShoppingListItemComment::factory()->forItem($this->item)->create();

    $this->deleteJson("{$this->base}/{$comment->uuid}")->assertNoContent();
    $this->deleteJson("{$this->base}/{$comment->uuid}")->assertNotFound();
});

// ---------------------------------------------------------------------------
// Авторизация: 401 / 403
// ---------------------------------------------------------------------------

it('returns 401 for all comment endpoints without a token', function (): void {
    $comment = ShoppingListItemComment::factory()->forItem($this->item)->create();

    $this->getJson($this->base)->assertUnauthorized();
    $this->postJson($this->base, ['body' => 'X'])->assertUnauthorized();
    $this->deleteJson("{$this->base}/{$comment->uuid}")->assertUnauthorized();
});

it('returns 403 for all comment endpoints of another users list', function (): void {
    $comment = ShoppingListItemComment::factory()->forItem($this->item)->create();
    Sanctum::actingAs(User::factory()->create());

    $this->getJson($this->base)->assertForbidden();
    $this->postJson($this->base, ['body' => 'Чужой'])->assertForbidden();
    $this->deleteJson("{$this->base}/{$comment->uuid}")->assertForbidden();

    expect(ShoppingListItemComment::withTrashed()->findOrFail($comment->id)->deleted_at)->toBeNull()
        ->and($this->item->comments()->count())->toBe(1);
});

// ---------------------------------------------------------------------------
// Вложенный биндинг: 404 (scopeBindings)
// ---------------------------------------------------------------------------

it('returns 404 for an item that belongs to another list of the same user', function (): void {
    Sanctum::actingAs($this->user);

    $otherList = ShoppingList::factory()->for($this->user)->create();
    $foreignItem = ShoppingListItem::factory()->forList($otherList)->create();

    $this->getJson("/api/v1/shopping-lists/{$this->list->uuid}/items/{$foreignItem->uuid}/comments")
        ->assertNotFound();
});

it('returns 404 for a comment that belongs to another item', function (): void {
    Sanctum::actingAs($this->user);

    $sibling = ShoppingListItem::factory()->forList($this->list)->create();
    $foreignComment = ShoppingListItemComment::factory()->forItem($sibling)->create();

    $this->deleteJson("{$this->base}/{$foreignComment->uuid}")->assertNotFound();

    expect(ShoppingListItemComment::find($foreignComment->id))->not->toBeNull();
});

it('returns 404 for a nonexistent comment uuid', function (): void {
    Sanctum::actingAs($this->user);

    $this->deleteJson("{$this->base}/".Str::uuid())->assertNotFound();
});
