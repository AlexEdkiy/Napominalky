<?php

declare(strict_types=1);

use App\Actions\ShoppingList\CreateListAction;
use App\Actions\ShoppingList\DeleteListAction;
use App\Actions\ShoppingList\UpdateListAction;
use App\Data\ShoppingListData;
use App\Models\ShoppingList;
use App\Models\User;
use Illuminate\Support\Str;

it('creates a list for the user with a generated uuid via CreateListAction', function (): void {
    $user = User::factory()->create();

    $list = (new CreateListAction())($user, new ShoppingListData(title: 'Groceries'));

    expect($list)->toBeInstanceOf(ShoppingList::class)
        ->and($list->user_id)->toBe($user->id)
        ->and($list->title)->toBe('Groceries')
        ->and($list->uuid)->toBeString()->not->toBeEmpty();
});

it('persists a client-provided uuid via CreateListAction', function (): void {
    $user = User::factory()->create();
    $uuid = (string) Str::uuid();

    $list = (new CreateListAction())($user, new ShoppingListData(title: 'Offline list'), $uuid);

    expect($list->uuid)->toBe($uuid)
        ->and(ShoppingList::where('uuid', $uuid)->where('user_id', $user->id)->exists())->toBeTrue();
});

it('updates a list title via UpdateListAction', function (): void {
    $list = ShoppingList::factory()->create(['title' => 'Before']);

    $updated = app(UpdateListAction::class)($list, new ShoppingListData(title: 'After'));

    expect($updated->title)->toBe('After')
        ->and($list->fresh()->title)->toBe('After');
});

it('soft deletes a list via DeleteListAction', function (): void {
    $list = ShoppingList::factory()->create();

    (new DeleteListAction())($list);

    expect(ShoppingList::find($list->id))->toBeNull()
        ->and(ShoppingList::withTrashed()->find($list->id)->deleted_at)->not->toBeNull();
});
