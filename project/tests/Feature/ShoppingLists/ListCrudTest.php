<?php

declare(strict_types=1);

use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\User;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

it('lists only the authenticated users active lists with progress', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create();
    ShoppingListItem::factory()->forList($list)->count(2)->create();
    ShoppingListItem::factory()->forList($list)->checked()->create();

    // Soft-deleted list — must be excluded by scopeActive.
    ShoppingList::factory()->for($user)->create()->delete();
    // Another user's list — must be excluded.
    ShoppingList::factory()->create();

    $response = $this->getJson('/api/v1/shopping-lists')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonStructure([
            'data' => [['uuid', 'title', 'items_count', 'checked_items_count', 'created_at', 'updated_at']],
        ]);

    expect($response->json('data.0.uuid'))->toBe($list->uuid)
        ->and($response->json('data.0.items_count'))->toBe(3)
        ->and($response->json('data.0.checked_items_count'))->toBe(1);
});

it('paginates the lists index', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    ShoppingList::factory()->for($user)->count(3)->create();

    $this->getJson('/api/v1/shopping-lists?per_page=2')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.per_page', 2)
        ->assertJsonPath('meta.total', 3);
});

it('creates a list and returns 201 with the resource structure', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/shopping-lists', ['title' => 'Weekly shop'])
        ->assertCreated()
        ->assertJsonStructure([
            'data' => ['uuid', 'title', 'items_count', 'checked_items_count', 'created_at', 'updated_at'],
        ])
        ->assertJsonPath('data.title', 'Weekly shop')
        ->assertJsonPath('data.items_count', 0)
        ->assertJsonPath('data.checked_items_count', 0)
        ->assertJsonMissingPath('data.id')
        ->assertJsonMissingPath('data.user_id');

    expect($user->shoppingLists()->count())->toBe(1);
});

it('persists a client-provided uuid on store', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $uuid = (string) Str::uuid();

    $this->postJson('/api/v1/shopping-lists', ['uuid' => $uuid, 'title' => 'Offline'])
        ->assertCreated()
        ->assertJsonPath('data.uuid', $uuid);

    expect(ShoppingList::where('uuid', $uuid)->where('user_id', $user->id)->exists())->toBeTrue();
});

it('rejects a missing title with 422', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/shopping-lists', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['title']);
});

it('rejects a duplicate uuid with 422', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $existing = ShoppingList::factory()->for($user)->create();

    $this->postJson('/api/v1/shopping-lists', [
        'uuid' => $existing->uuid,
        'title' => 'Conflict',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['uuid']);
});

it('shows a single list with progress', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create();
    ShoppingListItem::factory()->forList($list)->count(2)->create();
    ShoppingListItem::factory()->forList($list)->checked()->count(1)->create();

    $this->getJson("/api/v1/shopping-lists/{$list->uuid}")
        ->assertOk()
        ->assertJsonPath('data.uuid', $list->uuid)
        ->assertJsonPath('data.items_count', 3)
        ->assertJsonPath('data.checked_items_count', 1);
});

it('updates a list and returns 200', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create(['title' => 'Before']);

    $this->putJson("/api/v1/shopping-lists/{$list->uuid}", ['title' => 'After'])
        ->assertOk()
        ->assertJsonPath('data.title', 'After');

    expect($list->fresh()->title)->toBe('After');
});

it('soft deletes a list and returns 204', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create();

    $this->deleteJson("/api/v1/shopping-lists/{$list->uuid}")
        ->assertNoContent();

    expect(ShoppingList::find($list->id))->toBeNull()
        ->and(ShoppingList::withTrashed()->find($list->id)->deleted_at)->not->toBeNull();
});
