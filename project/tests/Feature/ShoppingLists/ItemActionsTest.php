<?php

declare(strict_types=1);

use App\Actions\ShoppingListItem\AddItemAction;
use App\Actions\ShoppingListItem\CheckItemAction;
use App\Actions\ShoppingListItem\DeleteItemAction;
use App\Actions\ShoppingListItem\UpdateItemAction;
use App\Data\ShoppingListItemData;
use App\Enums\ShoppingCategory;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\User;
use Illuminate\Support\Str;

it('adds an item inheriting user_id from the list owner via AddItemAction', function (): void {
    $owner = User::factory()->create();
    $list = ShoppingList::factory()->for($owner)->create();

    $item = (new AddItemAction())($list, new ShoppingListItemData(
        name: 'Milk',
        category: ShoppingCategory::Products,
    ));

    expect($item)->toBeInstanceOf(ShoppingListItem::class)
        ->and($item->shopping_list_id)->toBe($list->id)
        ->and($item->user_id)->toBe($owner->id)
        ->and($item->name)->toBe('Milk')
        ->and($item->category)->toBe(ShoppingCategory::Products)
        ->and($item->uuid)->toBeString()->not->toBeEmpty();
});

it('persists a client-provided uuid for an item via AddItemAction', function (): void {
    $list = ShoppingList::factory()->create();
    $uuid = (string) Str::uuid();

    $item = (new AddItemAction())($list, new ShoppingListItemData(name: 'Bread'), $uuid);

    expect($item->uuid)->toBe($uuid)
        ->and(ShoppingListItem::where('uuid', $uuid)->exists())->toBeTrue();
});

it('auto-increments position when none is provided', function (): void {
    $list = ShoppingList::factory()->create();

    $first = (new AddItemAction())($list, new ShoppingListItemData(name: 'First'));
    $second = (new AddItemAction())($list, new ShoppingListItemData(name: 'Second'));
    $third = (new AddItemAction())($list, new ShoppingListItemData(name: 'Third'));

    expect($first->position)->toBe(1)
        ->and($second->position)->toBe(2)
        ->and($third->position)->toBe(3);
});

it('honours an explicitly provided position', function (): void {
    $list = ShoppingList::factory()->create();

    $item = (new AddItemAction())($list, new ShoppingListItemData(name: 'Fixed', position: 7));

    expect($item->position)->toBe(7);
});

it('updates an item via UpdateItemAction', function (): void {
    $item = ShoppingListItem::factory()->create([
        'name' => 'Old',
        'category' => ShoppingCategory::Other,
    ]);

    $updated = (new UpdateItemAction())($item, new ShoppingListItemData(
        name: 'New',
        category: ShoppingCategory::Pharmacy,
        position: 5,
    ));

    expect($updated->name)->toBe('New')
        ->and($updated->category)->toBe(ShoppingCategory::Pharmacy)
        ->and($updated->position)->toBe(5);
});

it('toggles is_checked via CheckItemAction', function (): void {
    $item = ShoppingListItem::factory()->create(['is_checked' => false]);

    $checked = (new CheckItemAction())($item, true);
    expect($checked->is_checked)->toBeTrue()
        ->and($item->fresh()->is_checked)->toBeTrue();

    $unchecked = (new CheckItemAction())($item, false);
    expect($unchecked->is_checked)->toBeFalse()
        ->and($item->fresh()->is_checked)->toBeFalse();
});

it('soft deletes an item via DeleteItemAction', function (): void {
    $item = ShoppingListItem::factory()->create();

    (new DeleteItemAction())($item);

    expect(ShoppingListItem::find($item->id))->toBeNull()
        ->and(ShoppingListItem::withTrashed()->find($item->id)->deleted_at)->not->toBeNull();
});
