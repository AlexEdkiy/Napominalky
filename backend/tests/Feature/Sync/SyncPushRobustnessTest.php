<?php

declare(strict_types=1);

use App\Models\Note;
use App\Models\Reminder;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\User;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

/**
 * Регрессионные тесты на два бага синхронизации (sync-hardening):
 *
 *  1. Баг null-title: заметка/список без заголовка (payload.title=null) валила
 *     весь push-батч с 500 (NOT NULL constraint). Фикс: SyncChangeApplier коерсит
 *     null в '' для NON_NULLABLE_STRINGS = ['title', 'name'].
 *
 *  2. Баг camelCase: мобильный клиент слал payload в camelCase (shoppingListUuid,
 *     isPinned, isChecked, remindAt). Поля терялись, shoppingListUuid не резолвился
 *     в shopping_list_id → NOT NULL violation на FK, батч падал 500. Фикс:
 *     SyncChangeData::fromArray нормализует ключи через Str::snake.
 *
 * Все тесты работают через HTTP (POST /api/v1/sync/push) для полного end-to-end
 * покрытия цепочки: Request → Controller → SyncChangeData::fromArray → SyncChangeApplier.
 */

/**
 * Строит тело push-запроса с произвольным набором изменений.
 *
 * @param list<array<string, mixed>> $changes
 * @return array<string, mixed>
 */
function robustPushBody(array $changes, ?string $deviceUuid = null): array
{
    return [
        'device_uuid' => $deviceUuid ?? (string) Str::uuid(),
        'device_name' => 'TestDevice',
        'changes' => $changes,
    ];
}

/**
 * Строит одно изменение для push-батча (вариант для тестов робастности).
 *
 * @param array<string, mixed> $payload
 * @return array<string, mixed>
 */
function robustChange(
    string $entityType,
    string $uuid,
    array $payload,
    string $operation = 'create',
    string $updatedAt = '2026-06-01T10:00:00Z',
): array {
    return [
        'entity_type' => $entityType,
        'uuid' => $uuid,
        'operation' => $operation,
        'payload' => $payload,
        'updated_at' => $updatedAt,
    ];
}

// ---------------------------------------------------------------------------
// Баг 1: null title / name — NOT NULL constraint не должен рвать батч
// ---------------------------------------------------------------------------

it('pushes a note with null title without 500, stores title as empty string', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $uuid = (string) Str::uuid();

    $response = $this->postJson('/api/v1/sync/push', robustPushBody([
        robustChange('note', $uuid, [
            'title' => null,
            'body' => null,
        ]),
    ]));

    $response->assertOk()
        ->assertJsonPath('data.applied', [$uuid]);

    $note = Note::where('uuid', $uuid)->firstOrFail();
    expect($note->title)->toBe('');
});

it('pushes a shopping_list with null title without 500, stores title as empty string', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $uuid = (string) Str::uuid();

    $response = $this->postJson('/api/v1/sync/push', robustPushBody([
        robustChange('shopping_list', $uuid, ['title' => null]),
    ]));

    $response->assertOk()
        ->assertJsonPath('data.applied', [$uuid]);

    $list = ShoppingList::where('uuid', $uuid)->firstOrFail();
    expect($list->title)->toBe('');
});

it('pushes a shopping_list_item with null name without 500, stores name as empty string', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create();
    $itemUuid = (string) Str::uuid();

    $response = $this->postJson('/api/v1/sync/push', robustPushBody([
        robustChange('shopping_list_item', $itemUuid, [
            'shopping_list_uuid' => $list->uuid,
            'name' => null,
            'category' => 'products',
            'is_checked' => false,
            'position' => 0,
        ]),
    ]));

    $response->assertOk()
        ->assertJsonPath('data.applied', [$itemUuid]);

    $item = ShoppingListItem::where('uuid', $itemUuid)->firstOrFail();
    expect($item->name)->toBe('');
});

// ---------------------------------------------------------------------------
// Баг 2: camelCase payload — ключи должны нормализоваться в snake_case
// ---------------------------------------------------------------------------

it('handles camelCase payload for shopping_list + item in one batch, item is linked to parent', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $listUuid = (string) Str::uuid();
    $itemUuid = (string) Str::uuid();

    $response = $this->postJson('/api/v1/sync/push', robustPushBody([
        // Список в snake_case (нормальный путь)
        robustChange('shopping_list', $listUuid, ['title' => 'Groceries']),
        // Элемент в camelCase (как слал мобильный клиент)
        robustChange('shopping_list_item', $itemUuid, [
            'shoppingListUuid' => $listUuid,
            'name' => 'Milk',
            'category' => 'products',
            'isChecked' => 1,
            'position' => 0,
        ]),
    ]));

    $response->assertOk();

    $applied = $response->json('data.applied');
    expect($applied)->toContain($listUuid)
        ->and($applied)->toContain($itemUuid);

    $list = ShoppingList::where('uuid', $listUuid)->firstOrFail();
    $item = ShoppingListItem::where('uuid', $itemUuid)->firstOrFail();

    expect($item->shopping_list_id)->toBe($list->id)
        ->and($item->is_checked)->toBeTrue();
});

it('handles camelCase isPinned and isArchived in note payload', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $uuid = (string) Str::uuid();

    $response = $this->postJson('/api/v1/sync/push', robustPushBody([
        robustChange('note', $uuid, [
            'title' => 'Pinned note',
            'body' => 'content',
            'isPinned' => 1,
            'isArchived' => 0,
        ]),
    ]));

    $response->assertOk()
        ->assertJsonPath('data.applied', [$uuid]);

    $note = Note::where('uuid', $uuid)->firstOrFail();
    expect($note->is_pinned)->toBeTrue()
        ->and($note->is_archived)->toBeFalse();
});

it('handles camelCase remindAt and isCompleted in reminder payload', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $uuid = (string) Str::uuid();
    $remindAt = '2026-07-01T08:00:00Z';

    $response = $this->postJson('/api/v1/sync/push', robustPushBody([
        robustChange('reminder', $uuid, [
            'title' => 'Take medicine',
            'remindAt' => $remindAt,
            'isCompleted' => 0,
        ]),
    ]));

    $response->assertOk()
        ->assertJsonPath('data.applied', [$uuid]);

    $reminder = Reminder::where('uuid', $uuid)->firstOrFail();
    expect($reminder->remind_at)->not->toBeNull()
        ->and($reminder->remind_at->toISOString())->toBe(\Carbon\CarbonImmutable::parse($remindAt)->toISOString())
        ->and($reminder->is_completed)->toBeFalse();
});

// ---------------------------------------------------------------------------
// Анти-регресс: проблемная запись в батче больше не блокирует весь синк
// ---------------------------------------------------------------------------

it('applies the whole batch including a null-title note, pull returns both records', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $badUuid = (string) Str::uuid();   // раньше валил 500 и блокировал батч
    $goodUuid = (string) Str::uuid();

    $response = $this->postJson('/api/v1/sync/push', robustPushBody([
        robustChange('note', $badUuid, ['title' => null, 'body' => 'bad one']),
        robustChange('note', $goodUuid, ['title' => 'Good note', 'body' => 'ok']),
    ]));

    $response->assertOk();

    $applied = $response->json('data.applied');
    expect($applied)->toContain($badUuid)
        ->and($applied)->toContain($goodUuid);

    // GET /sync/changes?since=0 отдаёт обе записи — синк не заблокирован
    $pull = $this->getJson('/api/v1/sync/changes?since=0')->assertOk();
    $pulledUuids = array_column($pull->json('data.notes'), 'uuid');

    expect($pulledUuids)->toContain($badUuid)
        ->and($pulledUuids)->toContain($goodUuid);
});

// ---------------------------------------------------------------------------
// Баг 3 (REVIEW-1 / DEV-23): пункт-сирота — shopping_list_uuid не резолвится
// (чужой/неизвестный список). Раньше INSERT с shopping_list_id = NULL валил
// всю push-транзакцию 500, и клиент бесконечно ретраил тот же outbox.
// ---------------------------------------------------------------------------

it('skips an orphan shopping_list_item (unknown parent uuid) without 500, applies the rest of the batch', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $orphanUuid = (string) Str::uuid();
    $noteUuid = (string) Str::uuid();

    $response = $this->postJson('/api/v1/sync/push', robustPushBody([
        robustChange('shopping_list_item', $orphanUuid, [
            'shopping_list_uuid' => (string) Str::uuid(), // на сервере такого списка нет
            'name' => 'Orphan item',
            'category' => 'products',
            'is_checked' => false,
            'position' => 0,
        ]),
        robustChange('note', $noteUuid, ['title' => 'Survives', 'body' => null]),
    ]));

    $response->assertOk();

    expect(ShoppingListItem::query()->where('uuid', $orphanUuid)->exists())->toBeFalse()
        ->and(Note::query()->where('uuid', $noteUuid)->exists())->toBeTrue();
});

it('skips an orphan shopping_list_item whose parent belongs to another user', function (): void {
    $stranger = User::factory()->create();
    $foreignList = ShoppingList::factory()->for($stranger)->create();

    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $uuid = (string) Str::uuid();

    $this->postJson('/api/v1/sync/push', robustPushBody([
        robustChange('shopping_list_item', $uuid, [
            'shopping_list_uuid' => $foreignList->uuid,
            'name' => 'Sneaky',
            'category' => 'other',
            'is_checked' => false,
            'position' => 0,
        ]),
    ]))->assertOk();

    expect(ShoppingListItem::query()->where('uuid', $uuid)->exists())->toBeFalse()
        ->and($foreignList->items()->count())->toBe(0);
});
