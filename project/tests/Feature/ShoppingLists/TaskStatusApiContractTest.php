<?php

declare(strict_types=1);

use App\Enums\TaskStatus;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

/*
 * HTTP-контракт статусов: status/status_label/(status_is_manual) в ресурсах
 * списка и пункта, валидация невалидного status (422), номинальный статус
 * для goods (не 422).
 */

it('exposes status, status_label and status_is_manual in the list resource', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/shopping-lists', [
        'title' => 'Sprint',
        'type' => 'tasks',
        'status' => 'postponed',
    ])
        ->assertCreated()
        ->assertJsonStructure(['data' => ['uuid', 'status', 'status_label', 'status_is_manual']])
        ->assertJsonPath('data.status', 'postponed')
        ->assertJsonPath('data.status_label', 'Отложена')
        ->assertJsonPath('data.status_is_manual', true);
});

it('exposes status and status_label in the item resource on store and update', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->tasks()->for($user)->create();

    $response = $this->postJson("/api/v1/shopping-lists/{$list->uuid}/items", [
        'name' => 'Subtask',
        'status' => 'in_progress',
    ])
        ->assertCreated()
        ->assertJsonStructure(['data' => ['uuid', 'status', 'status_label', 'is_checked']])
        ->assertJsonPath('data.status', 'in_progress')
        ->assertJsonPath('data.status_label', 'В работе')
        ->assertJsonPath('data.is_checked', false);

    $itemUuid = $response->json('data.uuid');

    // PUT со status='done' → инвариант: is_checked=true в ответе и в БД.
    $this->putJson("/api/v1/shopping-lists/{$list->uuid}/items/{$itemUuid}", [
        'status' => 'done',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'done')
        ->assertJsonPath('data.status_label', 'Выполнена')
        ->assertJsonPath('data.is_checked', true);

    $item = ShoppingListItem::query()->where('uuid', $itemUuid)->firstOrFail();
    expect($item->status)->toBe(TaskStatus::Done)
        ->and($item->is_checked)->toBeTrue();
});

it('recalculates the parent task status via the item API', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->tasks()->for($user)->create();
    $item = ShoppingListItem::factory()->forList($list)->create();

    $this->putJson("/api/v1/shopping-lists/{$list->uuid}/items/{$item->uuid}", [
        'status' => 'in_progress',
    ])->assertOk();

    $this->getJson("/api/v1/shopping-lists/{$list->uuid}")
        ->assertOk()
        ->assertJsonPath('data.status', 'in_progress')
        ->assertJsonPath('data.status_is_manual', false);
});

it('keeps the done invariant when checking an item over the check endpoint', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->tasks()->for($user)->create();
    $item = ShoppingListItem::factory()->forList($list)->inProgress()->create();

    $this->postJson("/api/v1/shopping-lists/{$list->uuid}/items/{$item->uuid}/check", ['is_checked' => true])
        ->assertOk()
        ->assertJsonPath('data.status', 'done')
        ->assertJsonPath('data.is_checked', true);

    // Снятие отметки: done → new (forChecked), не возврат в in_progress.
    $this->postJson("/api/v1/shopping-lists/{$list->uuid}/items/{$item->uuid}/check", ['is_checked' => false])
        ->assertOk()
        ->assertJsonPath('data.status', 'new')
        ->assertJsonPath('data.is_checked', false);
});

it('rejects an invalid list status with 422', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->tasks()->for($user)->create();

    $this->postJson('/api/v1/shopping-lists', [
        'title' => 'Bad',
        'type' => 'tasks',
        'status' => 'cancelled',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['status']);

    $this->putJson("/api/v1/shopping-lists/{$list->uuid}", [
        'title' => $list->title,
        'status' => 'wip',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['status']);
});

it('rejects an invalid item status with 422', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->tasks()->for($user)->create();
    $item = ShoppingListItem::factory()->forList($list)->create();

    $this->postJson("/api/v1/shopping-lists/{$list->uuid}/items", [
        'name' => 'Bad',
        'status' => 'blocked',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['status']);

    $this->putJson("/api/v1/shopping-lists/{$list->uuid}/items/{$item->uuid}", [
        'status' => 'later',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['status']);
});

it('accepts a valid status for goods without a 422 keeping it nominal', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create(); // goods

    // Пункт goods-списка со status → 201, статус остаётся 'new'.
    $this->postJson("/api/v1/shopping-lists/{$list->uuid}/items", [
        'name' => 'Milk',
        'status' => 'in_progress',
    ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'new')
        ->assertJsonPath('data.status_label', 'Новая');

    // PUT goods-списка со status → 200 (номинально), статус 'new'.
    $this->putJson("/api/v1/shopping-lists/{$list->uuid}", [
        'title' => $list->title,
        'status' => 'in_progress',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'new')
        ->assertJsonPath('data.status_is_manual', false);
});

it('accepts a partial PUT with only status (no title) and keeps the title', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    // Регресс: смена статуса из таблицы шлёт PUT { status } БЕЗ title.
    // Раньше title=required давал 422 и/или контроллер затирал название.
    $list = ShoppingList::factory()->for($user)->tasks()->create([
        'title' => 'Перед уходом в отпуск',
        'status' => TaskStatus::New,
    ]);

    $this->putJson("/api/v1/shopping-lists/{$list->uuid}", [
        'status' => 'in_progress',
    ])
        ->assertOk()
        ->assertJsonPath('data.title', 'Перед уходом в отпуск')
        ->assertJsonPath('data.status', 'in_progress')
        ->assertJsonPath('data.status_is_manual', true);

    // «Авто»-сброс тоже partial (только status_is_manual), title не теряется.
    $this->putJson("/api/v1/shopping-lists/{$list->uuid}", [
        'status_is_manual' => false,
    ])
        ->assertOk()
        ->assertJsonPath('data.title', 'Перед уходом в отпуск')
        ->assertJsonPath('data.status_is_manual', false);
});
