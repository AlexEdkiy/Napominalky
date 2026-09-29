<?php

declare(strict_types=1);

use App\Enums\TaskStatus;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\User;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

/*
 * Sync-контур статусов задач: push применяет status с нормализацией
 * инварианта done ⇔ is_completed/is_checked и пересчётом родителя,
 * pull (/sync/changes) отдаёт status/status_is_manual списка и status пункта.
 */

/**
 * Тело push-запроса c одним изменением сущности статусной фичи.
 *
 * @param  array<string, mixed>  $payload
 * @return array<string, mixed>
 */
function taskStatusPushBody(
    string $entityType,
    string $uuid,
    array $payload,
    string $updatedAt = '2026-09-01T10:00:00Z',
    string $operation = 'create',
): array {
    return [
        'device_uuid' => (string) Str::uuid(),
        'device_name' => 'Pixel',
        'changes' => [[
            'entity_type' => $entityType,
            'uuid' => $uuid,
            'operation' => $operation,
            'payload' => $payload,
            'updated_at' => $updatedAt,
        ]],
    ];
}

it('applies a pushed tasks list status together with the manual pin', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $uuid = (string) Str::uuid();

    $this->postJson('/api/v1/sync/push', taskStatusPushBody('shopping_list', $uuid, [
        'title' => 'Sprint',
        'type' => 'tasks',
        'status' => 'postponed',
        'status_is_manual' => true,
    ]))
        ->assertOk()
        ->assertJsonPath('data.applied', [$uuid]);

    $list = ShoppingList::query()->where('uuid', $uuid)->firstOrFail();
    expect($list->status)->toBe(TaskStatus::Postponed)
        ->and($list->status_is_manual)->toBeTrue()
        ->and($list->is_completed)->toBeFalse();
});

it('normalizes is_completed from a pushed done list status (status priority)', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $uuid = (string) Str::uuid();

    // status='done' + противоречащий is_completed=false → приоритет у status.
    $this->postJson('/api/v1/sync/push', taskStatusPushBody('shopping_list', $uuid, [
        'title' => 'Done remotely',
        'type' => 'tasks',
        'status' => 'done',
        'is_completed' => false,
    ]))->assertOk();

    $list = ShoppingList::query()->where('uuid', $uuid)->firstOrFail();
    expect($list->status)->toBe(TaskStatus::Done)
        ->and($list->is_completed)->toBeTrue();
});

it('derives the list status from a pushed is_completed without status', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $uuid = (string) Str::uuid();

    $this->postJson('/api/v1/sync/push', taskStatusPushBody('shopping_list', $uuid, [
        'title' => 'Legacy client',
        'type' => 'tasks',
        'is_completed' => true,
    ]))->assertOk();

    $list = ShoppingList::query()->where('uuid', $uuid)->firstOrFail();
    expect($list->status)->toBe(TaskStatus::Done)
        ->and($list->is_completed)->toBeTrue();
});

it('forces the nominal status for a pushed goods list', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $uuid = (string) Str::uuid();

    $this->postJson('/api/v1/sync/push', taskStatusPushBody('shopping_list', $uuid, [
        'title' => 'Groceries',
        'type' => 'goods',
        'status' => 'done',
        'status_is_manual' => true,
    ]))->assertOk();

    $list = ShoppingList::query()->where('uuid', $uuid)->firstOrFail();
    expect($list->status)->toBe(TaskStatus::New)
        ->and($list->status_is_manual)->toBeFalse();
});

it('applies a pushed item status normalizing is_checked and recalculating the parent', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->tasks()->for($user)->create();
    $uuid = (string) Str::uuid();

    // status='done' при is_checked=false в payload → приоритет у status.
    $this->postJson('/api/v1/sync/push', taskStatusPushBody('shopping_list_item', $uuid, [
        'shopping_list_uuid' => $list->uuid,
        'name' => 'Ship release',
        'status' => 'done',
        'is_checked' => false,
    ]))
        ->assertOk()
        ->assertJsonPath('data.applied', [$uuid]);

    $item = ShoppingListItem::query()->where('uuid', $uuid)->firstOrFail();
    expect($item->status)->toBe(TaskStatus::Done)
        ->and($item->is_checked)->toBeTrue();

    // Родительская задача пересчитана: единственный пункт done → done.
    $list->refresh();
    expect($list->status)->toBe(TaskStatus::Done)
        ->and($list->is_completed)->toBeTrue();
});

it('derives the item status from a pushed is_checked without status', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->tasks()->for($user)->create();
    $item = ShoppingListItem::factory()->forList($list)->create();

    $this->postJson('/api/v1/sync/push', taskStatusPushBody('shopping_list_item', $item->uuid, [
        'name' => $item->name,
        'is_checked' => true,
    ], operation: 'update'))->assertOk();

    $item->refresh();
    expect($item->status)->toBe(TaskStatus::Done)
        ->and($item->is_checked)->toBeTrue();
});

it('does not alter a pinned manual list status when an item is pushed', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->tasks()->for($user)->create([
        'status' => TaskStatus::Postponed,
        'status_is_manual' => true,
    ]);
    $uuid = (string) Str::uuid();

    $this->postJson('/api/v1/sync/push', taskStatusPushBody('shopping_list_item', $uuid, [
        'shopping_list_uuid' => $list->uuid,
        'name' => 'New step',
        'status' => 'in_progress',
    ]))->assertOk();

    $list->refresh();
    expect($list->status)->toBe(TaskStatus::Postponed)
        ->and($list->status_is_manual)->toBeTrue();
});

it('forces the nominal status for an item pushed into a goods list', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create(); // goods
    $uuid = (string) Str::uuid();

    $this->postJson('/api/v1/sync/push', taskStatusPushBody('shopping_list_item', $uuid, [
        'shopping_list_uuid' => $list->uuid,
        'name' => 'Milk',
        'status' => 'in_progress',
    ]))->assertOk();

    $item = ShoppingListItem::query()->where('uuid', $uuid)->firstOrFail();
    expect($item->status)->toBe(TaskStatus::New)
        ->and($item->is_checked)->toBeFalse();
});

it('serializes list and item statuses in the sync pull payload', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->tasks()->for($user)->create([
        'status' => TaskStatus::InProgress,
        'status_is_manual' => true,
    ]);
    $item = ShoppingListItem::factory()->forList($list)->postponed()->create();

    $this->getJson('/api/v1/sync/changes?since=0')
        ->assertOk()
        ->assertJsonPath('data.shopping_lists.0.uuid', $list->uuid)
        ->assertJsonPath('data.shopping_lists.0.status', 'in_progress')
        ->assertJsonPath('data.shopping_lists.0.status_is_manual', true)
        ->assertJsonPath('data.shopping_lists.0.is_completed', false)
        ->assertJsonPath('data.shopping_list_items.0.uuid', $item->uuid)
        ->assertJsonPath('data.shopping_list_items.0.status', 'postponed');
});
