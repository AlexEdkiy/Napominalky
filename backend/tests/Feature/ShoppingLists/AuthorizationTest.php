<?php

declare(strict_types=1);

use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('returns 401 for unauthenticated access to lists index', function (): void {
    $this->getJson('/api/v1/shopping-lists')->assertUnauthorized();
});

it('returns 401 for unauthenticated list creation', function (): void {
    $this->postJson('/api/v1/shopping-lists', ['title' => 'No token'])
        ->assertUnauthorized();
});

it('returns 403 when accessing another users list', function (): void {
    $user = User::factory()->create();
    $list = ShoppingList::factory()->create(); // another owner

    Sanctum::actingAs($user);

    $this->getJson("/api/v1/shopping-lists/{$list->uuid}")->assertForbidden();
});

it('returns 403 when updating another users list', function (): void {
    $user = User::factory()->create();
    $list = ShoppingList::factory()->create();

    Sanctum::actingAs($user);

    $this->putJson("/api/v1/shopping-lists/{$list->uuid}", ['title' => 'Hijack'])
        ->assertForbidden();
});

it('returns 403 when deleting another users list', function (): void {
    $user = User::factory()->create();
    $list = ShoppingList::factory()->create();

    Sanctum::actingAs($user);

    $this->deleteJson("/api/v1/shopping-lists/{$list->uuid}")->assertForbidden();
});

it('returns 403 when checking an item in another users list', function (): void {
    $user = User::factory()->create();
    $list = ShoppingList::factory()->create();
    $item = ShoppingListItem::factory()->forList($list)->create();

    Sanctum::actingAs($user);

    $this->postJson(
        "/api/v1/shopping-lists/{$list->uuid}/items/{$item->uuid}/check",
        ['is_checked' => true],
    )->assertForbidden();
});

it('returns 404 when the item does not belong to the given list (scopeBindings)', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create();
    $otherList = ShoppingList::factory()->for($user)->create();
    $foreignItem = ShoppingListItem::factory()->forList($otherList)->create();

    $this->putJson(
        "/api/v1/shopping-lists/{$list->uuid}/items/{$foreignItem->uuid}",
        ['name' => 'Nope'],
    )->assertNotFound();

    $this->deleteJson("/api/v1/shopping-lists/{$list->uuid}/items/{$foreignItem->uuid}")
        ->assertNotFound();

    $this->postJson(
        "/api/v1/shopping-lists/{$list->uuid}/items/{$foreignItem->uuid}/check",
        ['is_checked' => true],
    )->assertNotFound();
});

it('returns 422 for an invalid category on item store', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create();

    $this->postJson("/api/v1/shopping-lists/{$list->uuid}/items", [
        'name' => 'Mystery',
        'category' => 'spaceship',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['category']);
});

it('returns 422 for an invalid category on item update', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create();
    $item = ShoppingListItem::factory()->forList($list)->create();

    $this->putJson("/api/v1/shopping-lists/{$list->uuid}/items/{$item->uuid}", [
        'category' => 'spaceship',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['category']);
});
