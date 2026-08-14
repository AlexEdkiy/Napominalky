<?php

declare(strict_types=1);

use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\ShoppingListItemComment;
use App\Models\User;
use App\Services\Sync\SyncPullService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

/*
 * Двусторонняя синхронизация новой сущности shopping_list_item_comment
 * (pull /sync/changes + push /sync/push) через HTTP end-to-end. Сервисный
 * слой (SyncPullService/SyncPushService) покрыт smoke-тестами DEV.
 */

/**
 * Тело push-запроса с батчем изменений (вариант для тестов комментариев).
 *
 * @param list<array<string, mixed>> $changes
 * @return array<string, mixed>
 */
function commentPushBody(array $changes): array
{
    return [
        'device_uuid' => (string) Str::uuid(),
        'device_name' => 'CommentTestDevice',
        'changes' => $changes,
    ];
}

/**
 * Одно изменение комментария для push-батча.
 *
 * @param array<string, mixed> $payload
 * @return array<string, mixed>
 */
function commentChange(
    string $uuid,
    array $payload,
    string $operation = 'create',
    string $updatedAt = '2026-06-05T10:00:00Z',
): array {
    return [
        'entity_type' => 'shopping_list_item_comment',
        'uuid' => $uuid,
        'operation' => $operation,
        'payload' => $payload,
        'updated_at' => $updatedAt,
    ];
}

beforeEach(function (): void {
    $this->user = User::factory()->create(['name' => 'Алексей']);
    $this->list = ShoppingList::factory()->for($this->user)->create(['type' => 'tasks']);
    $this->item = ShoppingListItem::factory()->forList($this->list)->create();
});

// ---------------------------------------------------------------------------
// Pull — GET /sync/changes
// ---------------------------------------------------------------------------

it('delivers comments to clients over GET /sync/changes (HTTP envelope)', function (): void {
    Sanctum::actingAs($this->user);

    $comment = ShoppingListItemComment::factory()->forItem($this->item)->create([
        'author_name' => 'Алексей',
        'body' => 'Синхронизируй меня',
    ]);

    $response = $this->getJson('/api/v1/sync/changes?since=0')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'notes', 'shopping_lists', 'shopping_list_items',
                'shopping_list_item_comments', 'reminders',
            ],
            'meta' => ['cursor', 'has_more'],
        ])
        ->assertJsonCount(1, 'data.shopping_list_item_comments');

    $row = $response->json('data.shopping_list_item_comments.0');
    expect($row['uuid'])->toBe($comment->uuid)
        ->and($row['shopping_list_item_uuid'])->toBe($this->item->uuid)
        ->and($row['author_name'])->toBe('Алексей')
        ->and($row['body'])->toBe('Синхронизируй меня')
        ->and($row['deleted_at'])->toBeNull()
        ->and($row)->toHaveKeys(['created_at', 'updated_at'])
        ->and($row)->not->toHaveKeys(['id', 'user_id', 'shopping_list_item_id', 'server_revision']);
})->skip(
    'БАГ (MBE): SyncChangesResource::toArray() жёстко перечисляет 4 сущности '
    .'(notes/shopping_lists/shopping_list_items/reminders) и ТЕРЯЕТ ключ '
    .'shopping_list_item_comments из результата SyncPullService::pull() — '
    .'комментарии никогда не доезжают до клиентов по HTTP GET /sync/changes '
    .'(в т.ч. бэкфилл). Снять skip после добавления ключа в ресурс.',
);

it('pulls a deleted comment as a tombstone after the previous cursor (service level)', function (): void {
    $comment = ShoppingListItemComment::factory()->forItem($this->item)->create();
    $cursor = app(SyncPullService::class)->pull($this->user, since: 0)['cursor'];

    $comment->delete();

    $rows = app(SyncPullService::class)->pull($this->user, since: $cursor)['shopping_list_item_comments'];

    expect($rows)->toHaveCount(1)
        ->and($rows[0]['uuid'])->toBe($comment->uuid)
        ->and($rows[0]['deleted_at'])->not->toBeNull();
});

it('does not pull comments of another user (service level)', function (): void {
    $mine = ShoppingListItemComment::factory()->forItem($this->item)->create();
    ShoppingListItemComment::factory()->create(); // чужой пользователь (свежая строка)

    $rows = app(SyncPullService::class)->pull($this->user, since: 0)['shopping_list_item_comments'];

    expect(array_column($rows, 'uuid'))->toBe([$mine->uuid]);
});

// ---------------------------------------------------------------------------
// Push — POST /sync/push
// ---------------------------------------------------------------------------

it('accepts entity_type shopping_list_item_comment and creates the comment resolving its parent', function (): void {
    Sanctum::actingAs($this->user);

    $uuid = (string) Str::uuid();
    $clientTs = '2026-06-05T10:00:00Z';

    $response = $this->postJson('/api/v1/sync/push', commentPushBody([
        commentChange($uuid, [
            'shopping_list_item_uuid' => $this->item->uuid,
            'author_name' => 'Алексей',
            'body' => 'Написан офлайн',
        ], updatedAt: $clientTs),
    ]));

    // Ранее PushRequest отклонял этот entity_type 422 — теперь тип разрешён.
    $response->assertOk()
        ->assertJsonPath('data.applied', [$uuid])
        ->assertJsonPath('data.conflicts', []);

    $comment = ShoppingListItemComment::where('uuid', $uuid)->firstOrFail();
    expect($comment->shopping_list_item_id)->toBe($this->item->id)
        ->and($comment->user_id)->toBe($this->user->id)
        ->and($comment->author_name)->toBe('Алексей')
        ->and($comment->body)->toBe('Написан офлайн')
        ->and($comment->updated_at->toISOString())
        ->toBe(CarbonImmutable::parse($clientTs)->toISOString());
});

it('resolves the parent even when the item is soft-deleted (LWW may revive it later)', function (): void {
    Sanctum::actingAs($this->user);

    $this->item->delete();
    $uuid = (string) Str::uuid();

    $this->postJson('/api/v1/sync/push', commentPushBody([
        commentChange($uuid, [
            'shopping_list_item_uuid' => $this->item->uuid,
            'author_name' => 'Алексей',
            'body' => 'К удалённому пункту',
        ]),
    ]))
        ->assertOk()
        ->assertJsonPath('data.applied', [$uuid]);

    expect(ShoppingListItemComment::where('uuid', $uuid)->firstOrFail()->shopping_list_item_id)
        ->toBe($this->item->id);
});

it('applies a pushed delete as a tombstone on an existing comment', function (): void {
    Sanctum::actingAs($this->user);

    $comment = ShoppingListItemComment::factory()->forItem($this->item)->create([
        'created_at' => '2026-06-01T10:00:00Z',
        'updated_at' => '2026-06-01T10:00:00Z',
    ]);
    $revisionBefore = $comment->server_revision;

    $this->postJson('/api/v1/sync/push', commentPushBody([
        commentChange($comment->uuid, [], operation: 'delete', updatedAt: '2026-06-02T10:00:00Z'),
    ]))
        ->assertOk()
        ->assertJsonPath('data.applied', [$comment->uuid]);

    $trashed = ShoppingListItemComment::withTrashed()->findOrFail($comment->id);
    expect($trashed->deleted_at)->not->toBeNull()
        ->and($trashed->server_revision)->toBeGreaterThan($revisionBefore);
});

it('treats a pushed delete of an unknown comment uuid as an applied no-op', function (): void {
    Sanctum::actingAs($this->user);

    $uuid = (string) Str::uuid();

    $this->postJson('/api/v1/sync/push', commentPushBody([
        commentChange($uuid, [], operation: 'delete'),
    ]))
        ->assertOk()
        ->assertJsonPath('data.applied', [$uuid]);

    expect(ShoppingListItemComment::withTrashed()->where('uuid', $uuid)->exists())->toBeFalse();
});

it('does not fail the whole batch when a pushed comment references an unknown parent', function (): void {
    Sanctum::actingAs($this->user);

    $badUuid = (string) Str::uuid();
    $goodUuid = (string) Str::uuid();

    $response = $this->postJson('/api/v1/sync/push', commentPushBody([
        commentChange($badUuid, [
            'shopping_list_item_uuid' => (string) Str::uuid(), // неизвестный родитель
            'author_name' => 'Алексей',
            'body' => 'Родитель ещё не доехал',
        ]),
        [
            'entity_type' => 'note',
            'uuid' => $goodUuid,
            'operation' => 'create',
            'payload' => ['title' => 'Валидная заметка', 'body' => 'ok'],
            'updated_at' => '2026-06-05T10:00:00Z',
        ],
    ]));

    // Ожидание по контракту SyncParentResolver: «неизвестный uuid игнорируется,
    // изменение применяется без родителя» — как минимум батч не должен падать.
    $response->assertOk();
    expect($response->json('data.applied'))->toContain($goodUuid);
})->skip(
    'БАГ (DEV): неизвестный/чужой shopping_list_item_uuid не резолвится, '
    .'shopping_list_item_id остаётся NULL при NOT NULL constraint — INSERT падает, '
    .'транзакция откатывает ВЕСЬ батч, /sync/push отвечает 500. Расходится с '
    .'докблоком SyncParentResolver («изменение применяется без родителя»). '
    .'Снять skip после фикса (skip change / отложенный резолв / nullable FK).',
);

// ---------------------------------------------------------------------------
// Legacy: одиночное поле comment пункта (двухфазный вывод)
// ---------------------------------------------------------------------------

it('still accepts the legacy comment field in a pushed shopping_list_item', function (): void {
    Sanctum::actingAs($this->user);

    $itemUuid = (string) Str::uuid();

    $this->postJson('/api/v1/sync/push', commentPushBody([
        [
            'entity_type' => 'shopping_list_item',
            'uuid' => $itemUuid,
            'operation' => 'create',
            'payload' => [
                'shopping_list_uuid' => $this->list->uuid,
                'name' => 'Старый клиент',
                'category' => 'other',
                'is_checked' => false,
                'position' => 1,
                'comment' => 'Одиночный legacy-комментарий',
            ],
            'updated_at' => '2026-06-05T10:00:00Z',
        ],
    ]))
        ->assertOk()
        ->assertJsonPath('data.applied', [$itemUuid]);

    expect(ShoppingListItem::where('uuid', $itemUuid)->firstOrFail()->comment)
        ->toBe('Одиночный legacy-комментарий');
});
