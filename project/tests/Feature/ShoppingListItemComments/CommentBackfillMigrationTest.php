<?php

declare(strict_types=1);

use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\ShoppingListItemComment;
use App\Models\User;
use App\Services\Sync\SyncPullService;

/*
 * Бэкфилл legacy-поля shopping_list_items.comment в тред
 * (миграция 2026_08_14_110100). RefreshDatabase прогоняет миграции до
 * вставки тестовых данных, поэтому историческое состояние воспроизводится
 * повторным вызовом up() той же миграции на подготовленных фабриками
 * строках — исполняется ровно тот SQL, что шёл в бой.
 */

/**
 * Повторно исполняет боевой up() бэкфилл-миграции.
 */
function runCommentBackfillMigration(): void
{
    $migration = require database_path(
        'migrations/2026_08_14_110100_backfill_item_comments_from_legacy_comment.php',
    );
    $migration->up();
}

beforeEach(function (): void {
    $this->user = User::factory()->create(['name' => 'Владимир']);
    $this->list = ShoppingList::factory()->for($this->user)->create(['type' => 'tasks']);
});

it('transfers a non-empty legacy comment into a single thread comment', function (): void {
    $item = ShoppingListItem::factory()->forList($this->list)->create([
        'comment' => 'Купить со скидкой',
        'created_at' => '2026-06-01T09:00:00Z',
        'updated_at' => '2026-06-10T12:00:00Z',
    ]);

    runCommentBackfillMigration();

    $comments = $item->comments()->get();
    expect($comments)->toHaveCount(1);

    $comment = $comments->first();
    expect($comment->body)->toBe('Купить со скидкой')
        ->and($comment->author_name)->toBe('Владимир')
        ->and($comment->user_id)->toBe($this->user->id)
        ->and($comment->uuid)->not->toBeEmpty()
        ->and($comment->server_revision)->toBeGreaterThan(0)
        ->and($comment->created_at->toISOString())->toBe('2026-06-10T12:00:00.000000Z');

    // Legacy-колонка не очищается (двухфазный вывод).
    expect($item->fresh()->comment)->toBe('Купить со скидкой');
});

it('skips items with null, empty and whitespace-only legacy comments', function (): void {
    ShoppingListItem::factory()->forList($this->list)->create(['comment' => null]);
    ShoppingListItem::factory()->forList($this->list)->create(['comment' => '']);
    ShoppingListItem::factory()->forList($this->list)->create(['comment' => '   ']);

    runCommentBackfillMigration();

    expect(ShoppingListItemComment::withTrashed()->count())->toBe(0);
});

it('does not transfer legacy comments of tombstone items', function (): void {
    $trashed = ShoppingListItem::factory()->forList($this->list)->create([
        'comment' => 'Комментарий удалённого пункта',
    ]);
    $trashed->delete();

    runCommentBackfillMigration();

    expect(ShoppingListItemComment::withTrashed()->count())->toBe(0);
});

it('delivers backfilled comments via incremental sync pull (service level)', function (): void {
    // Сервисный уровень: HTTP-выдача комментариев сломана багом
    // SyncChangesResource (см. skip в CommentSyncTest).
    $item = ShoppingListItem::factory()->forList($this->list)->create([
        'comment' => 'Исторический комментарий',
    ]);

    // Клиент уже полностью синхронизирован до бэкфилла.
    $cursor = app(SyncPullService::class)->pull($this->user, since: 0)['cursor'];

    runCommentBackfillMigration();

    // Инкрементальный pull после бэкфилла: server_revision комментария > курсора.
    $rows = app(SyncPullService::class)->pull($this->user, since: $cursor)['shopping_list_item_comments'];

    expect($rows)->toHaveCount(1)
        ->and($rows[0]['shopping_list_item_uuid'])->toBe($item->uuid)
        ->and($rows[0]['author_name'])->toBe('Владимир')
        ->and($rows[0]['body'])->toBe('Исторический комментарий')
        ->and($rows[0]['deleted_at'])->toBeNull();
});
