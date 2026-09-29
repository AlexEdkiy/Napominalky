<?php

declare(strict_types=1);

use App\Models\ShoppingList;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('creates a list with is_completed=false by default and exposes it in the resource', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/shopping-lists', ['title' => 'Groceries'])
        ->assertCreated()
        ->assertJsonPath('data.is_completed', false);

    expect($user->shoppingLists()->first()->is_completed)->toBeFalse();
});

it('marks a list completed via PUT and returns is_completed=true', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create(['title' => 'Weekend']);

    $this->putJson("/api/v1/shopping-lists/{$list->uuid}", [
        'title' => 'Weekend',
        'is_completed' => true,
    ])
        ->assertOk()
        ->assertJsonPath('data.is_completed', true);

    expect($list->fresh()->is_completed)->toBeTrue();
});

it('keeps is_completed untouched when PUT omits the field', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create([
        'title' => 'Done list',
        'is_completed' => true,
    ]);

    $this->putJson("/api/v1/shopping-lists/{$list->uuid}", ['title' => 'Renamed'])
        ->assertOk()
        ->assertJsonPath('data.is_completed', true);

    expect($list->fresh()->is_completed)->toBeTrue();
});

it('rejects a non-boolean is_completed with 422', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create();

    $this->putJson("/api/v1/shopping-lists/{$list->uuid}", [
        'title' => 'Whatever',
        'is_completed' => 'definitely-not-a-boolean',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['is_completed']);
});
