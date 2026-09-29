<?php

declare(strict_types=1);

use App\Enums\ShoppingCategory;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\User;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

it('lists items ordered by position', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create();
    $second = ShoppingListItem::factory()->forList($list)->create(['name' => 'Second', 'position' => 2]);
    $first = ShoppingListItem::factory()->forList($list)->create(['name' => 'First', 'position' => 1]);
    $third = ShoppingListItem::factory()->forList($list)->create(['name' => 'Third', 'position' => 3]);

    $response = $this->getJson("/api/v1/shopping-lists/{$list->uuid}/items")
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonStructure([
            'data' => [['uuid', 'name', 'category', 'category_label', 'is_checked', 'position', 'created_at', 'updated_at']],
        ]);

    expect($response->json('data.0.uuid'))->toBe($first->uuid)
        ->and($response->json('data.1.uuid'))->toBe($second->uuid)
        ->and($response->json('data.2.uuid'))->toBe($third->uuid);
});

it('creates an item with 201, default category other and auto position', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create();

    $first = $this->postJson("/api/v1/shopping-lists/{$list->uuid}/items", ['name' => 'Milk'])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Milk')
        ->assertJsonPath('data.category', ShoppingCategory::Other->value)
        ->assertJsonPath('data.category_label', ShoppingCategory::Other->label())
        ->assertJsonPath('data.is_checked', false)
        ->assertJsonPath('data.position', 1)
        ->assertJsonMissingPath('data.id')
        ->assertJsonMissingPath('data.user_id');

    $this->postJson("/api/v1/shopping-lists/{$list->uuid}/items", ['name' => 'Bread'])
        ->assertCreated()
        ->assertJsonPath('data.position', 2);

    $created = ShoppingListItem::where('uuid', $first->json('data.uuid'))->firstOrFail();
    expect($created->user_id)->toBe($user->id);
});

it('persists a client-provided uuid on item store', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create();
    $uuid = (string) Str::uuid();

    $this->postJson("/api/v1/shopping-lists/{$list->uuid}/items", [
        'uuid' => $uuid,
        'name' => 'Eggs',
        'category' => ShoppingCategory::Products->value,
    ])
        ->assertCreated()
        ->assertJsonPath('data.uuid', $uuid)
        ->assertJsonPath('data.category', ShoppingCategory::Products->value);

    expect(ShoppingListItem::where('uuid', $uuid)->exists())->toBeTrue();
});

it('rejects an item without a name with 422', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create();

    $this->postJson("/api/v1/shopping-lists/{$list->uuid}/items", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name']);
});

it('partially updates an item and can change its category', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create();
    $item = ShoppingListItem::factory()->forList($list)->create([
        'name' => 'Soap',
        'category' => ShoppingCategory::Other,
        'position' => 4,
    ]);

    $this->putJson("/api/v1/shopping-lists/{$list->uuid}/items/{$item->uuid}", [
        'category' => ShoppingCategory::Household->value,
    ])
        ->assertOk()
        ->assertJsonPath('data.category', ShoppingCategory::Household->value)
        ->assertJsonPath('data.name', 'Soap')
        ->assertJsonPath('data.position', 4);

    expect($item->fresh()->category)->toBe(ShoppingCategory::Household);
});

it('soft deletes an item and returns 204', function (): void {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $list = ShoppingList::factory()->for($user)->create();
    $item = ShoppingListItem::factory()->forList($list)->create();

    $this->deleteJson("/api/v1/shopping-lists/{$list->uuid}/items/{$item->uuid}")
        ->assertNoContent();

    expect(ShoppingListItem::find($item->id))->toBeNull()
        ->and(ShoppingListItem::withTrashed()->find($item->id)->deleted_at)->not->toBeNull();
});
