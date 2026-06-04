<?php

declare(strict_types=1);

use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('toggles is_checked on and off via the check endpoint', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create();
    $item = ShoppingListItem::factory()->forList($list)->create(['is_checked' => false]);

    $this->postJson("/api/v1/shopping-lists/{$list->uuid}/items/{$item->uuid}/check", ['is_checked' => true])
        ->assertOk()
        ->assertJsonPath('data.is_checked', true);

    expect($item->fresh()->is_checked)->toBeTrue();

    $this->postJson("/api/v1/shopping-lists/{$list->uuid}/items/{$item->uuid}/check", ['is_checked' => false])
        ->assertOk()
        ->assertJsonPath('data.is_checked', false);

    expect($item->fresh()->is_checked)->toBeFalse();
});

it('reflects checked items in the list progress counter', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create();
    $items = ShoppingListItem::factory()->forList($list)->count(3)->create(['is_checked' => false]);

    $this->getJson("/api/v1/shopping-lists/{$list->uuid}")
        ->assertOk()
        ->assertJsonPath('data.items_count', 3)
        ->assertJsonPath('data.checked_items_count', 0);

    $this->postJson(
        "/api/v1/shopping-lists/{$list->uuid}/items/{$items[0]->uuid}/check",
        ['is_checked' => true],
    )->assertOk();

    $this->postJson(
        "/api/v1/shopping-lists/{$list->uuid}/items/{$items[1]->uuid}/check",
        ['is_checked' => true],
    )->assertOk();

    $this->getJson("/api/v1/shopping-lists/{$list->uuid}")
        ->assertOk()
        ->assertJsonPath('data.items_count', 3)
        ->assertJsonPath('data.checked_items_count', 2);
});

it('requires the is_checked field with 422', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create();
    $item = ShoppingListItem::factory()->forList($list)->create();

    $this->postJson("/api/v1/shopping-lists/{$list->uuid}/items/{$item->uuid}/check", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['is_checked']);
});
