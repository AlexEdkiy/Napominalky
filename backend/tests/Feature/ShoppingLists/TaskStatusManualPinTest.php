<?php

declare(strict_types=1);

use App\Actions\ShoppingListItem\CheckItemAction;
use App\Enums\TaskStatus;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

/*
 * Закрепление ручного статуса задачи (status_is_manual) и его сброс:
 * явный status в PUT/POST пинит статус (автодеривация отключается),
 * status_is_manual=false / is_completed=false снимают закрепление.
 */

it('pins a manual status via PUT and stops auto-derivation from items', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->tasks()->for($user)->create();
    $item = ShoppingListItem::factory()->forList($list)->create();

    $this->putJson("/api/v1/shopping-lists/{$list->uuid}", [
        'title' => $list->title,
        'status' => 'postponed',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'postponed')
        ->assertJsonPath('data.status_is_manual', true)
        ->assertJsonPath('data.is_completed', false);

    // Изменение пунктов больше НЕ меняет закреплённый статус задачи.
    app(CheckItemAction::class)($item, true);

    $list->refresh();
    expect($list->status)->toBe(TaskStatus::Postponed)
        ->and($list->status_is_manual)->toBeTrue()
        ->and($list->is_completed)->toBeFalse();
});

it('pins done via PUT status and enforces is_completed=true', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->tasks()->for($user)->create();

    $this->putJson("/api/v1/shopping-lists/{$list->uuid}", [
        'title' => $list->title,
        'status' => 'done',
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'done')
        ->assertJsonPath('data.is_completed', true);

    $list->refresh();
    expect($list->status)->toBe(TaskStatus::Done)
        ->and($list->is_completed)->toBeTrue()
        ->and($list->status_is_manual)->toBeTrue();
});

it('prefers status over is_completed when both are sent', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->tasks()->for($user)->create();

    // status='in_progress' + is_completed=true → приоритет у status.
    $this->putJson("/api/v1/shopping-lists/{$list->uuid}", [
        'title' => $list->title,
        'status' => 'in_progress',
        'is_completed' => true,
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'in_progress')
        ->assertJsonPath('data.is_completed', false);

    $list->refresh();
    expect($list->status)->toBe(TaskStatus::InProgress)
        ->and($list->is_completed)->toBeFalse();
});

it('resumes auto-derivation after PUT status_is_manual=false', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->tasks()->for($user)->create([
        'status' => TaskStatus::Postponed,
        'status_is_manual' => true,
    ]);
    ShoppingListItem::factory()->forList($list)->inProgress()->create();

    $this->putJson("/api/v1/shopping-lists/{$list->uuid}", [
        'title' => $list->title,
        'status_is_manual' => false,
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'in_progress')
        ->assertJsonPath('data.status_is_manual', false);

    $list->refresh();
    expect($list->status)->toBe(TaskStatus::InProgress)
        ->and($list->status_is_manual)->toBeFalse();
});

it('treats PUT is_completed=true without status as a manual done', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->tasks()->for($user)->create();
    ShoppingListItem::factory()->forList($list)->inProgress()->create();

    $this->putJson("/api/v1/shopping-lists/{$list->uuid}", [
        'title' => $list->title,
        'is_completed' => true,
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'done')
        ->assertJsonPath('data.is_completed', true)
        ->assertJsonPath('data.status_is_manual', true);
});

it('unpins and recalculates after PUT is_completed=false', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->done()->for($user)->create();
    ShoppingListItem::factory()->forList($list)->inProgress()->create();

    $this->putJson("/api/v1/shopping-lists/{$list->uuid}", [
        'title' => $list->title,
        'is_completed' => false,
    ])
        ->assertOk()
        ->assertJsonPath('data.is_completed', false)
        ->assertJsonPath('data.status_is_manual', false)
        // Закрепление снято → статус пересчитан из пунктов ([in_progress]).
        ->assertJsonPath('data.status', 'in_progress');

    $list->refresh();
    expect($list->status)->toBe(TaskStatus::InProgress)
        ->and($list->status_is_manual)->toBeFalse()
        ->and($list->is_completed)->toBeFalse();
});

it('pins the status when a tasks list is created with an explicit status', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/shopping-lists', [
        'title' => 'Sprint',
        'type' => 'tasks',
        'status' => 'in_progress',
    ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'in_progress')
        ->assertJsonPath('data.status_is_manual', true)
        ->assertJsonPath('data.is_completed', false);

    $list = $user->shoppingLists()->firstOrFail();
    expect($list->status)->toBe(TaskStatus::InProgress)
        ->and($list->status_is_manual)->toBeTrue();
});

it('ignores the status for goods lists keeping the previous behaviour', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    // POST goods со status → 201, статус остаётся номинальным 'new'.
    $this->postJson('/api/v1/shopping-lists', [
        'title' => 'Groceries',
        'type' => 'goods',
        'status' => 'done',
    ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'new')
        ->assertJsonPath('data.status_is_manual', false)
        ->assertJsonPath('data.is_completed', false);

    $list = $user->shoppingLists()->firstOrFail();
    expect($list->refresh()->status)->toBe(TaskStatus::New)
        ->and($list->is_completed)->toBeFalse();

    // PUT goods со status → 200, is_completed работает как раньше.
    $this->putJson("/api/v1/shopping-lists/{$list->uuid}", [
        'title' => $list->title,
        'status' => 'done',
        'is_completed' => true,
    ])
        ->assertOk()
        ->assertJsonPath('data.status', 'new')
        ->assertJsonPath('data.is_completed', true);

    $list->refresh();
    expect($list->status)->toBe(TaskStatus::New)
        ->and($list->status_is_manual)->toBeFalse()
        ->and($list->is_completed)->toBeTrue();
});
