<?php

declare(strict_types=1);

use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\User;

it('allows the owner to view, update and delete their shopping list', function (): void {
    $owner = User::factory()->create();
    $list = ShoppingList::factory()->for($owner)->create();

    expect($owner->can('view', $list))->toBeTrue()
        ->and($owner->can('update', $list))->toBeTrue()
        ->and($owner->can('delete', $list))->toBeTrue();
});

it('denies a non-owner from view, update and delete of a shopping list', function (): void {
    $owner = User::factory()->create();
    $stranger = User::factory()->create();
    $list = ShoppingList::factory()->for($owner)->create();

    expect($stranger->can('view', $list))->toBeFalse()
        ->and($stranger->can('update', $list))->toBeFalse()
        ->and($stranger->can('delete', $list))->toBeFalse();
});

it('allows any authenticated user to viewAny and create shopping lists', function (): void {
    $user = User::factory()->create();

    expect($user->can('viewAny', ShoppingList::class))->toBeTrue()
        ->and($user->can('create', ShoppingList::class))->toBeTrue();
});

it('allows the item owner (by user_id) to view, update and delete the item', function (): void {
    $owner = User::factory()->create();
    $list = ShoppingList::factory()->for($owner)->create();
    $item = ShoppingListItem::factory()->forList($list)->create();

    expect($item->user_id)->toBe($owner->id)
        ->and($owner->can('view', $item))->toBeTrue()
        ->and($owner->can('update', $item))->toBeTrue()
        ->and($owner->can('delete', $item))->toBeTrue();
});

it('denies a non-owner from view, update and delete of an item', function (): void {
    $owner = User::factory()->create();
    $stranger = User::factory()->create();
    $list = ShoppingList::factory()->for($owner)->create();
    $item = ShoppingListItem::factory()->forList($list)->create();

    expect($stranger->can('view', $item))->toBeFalse()
        ->and($stranger->can('update', $item))->toBeFalse()
        ->and($stranger->can('delete', $item))->toBeFalse();
});
