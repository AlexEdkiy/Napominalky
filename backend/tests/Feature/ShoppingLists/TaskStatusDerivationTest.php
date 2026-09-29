<?php

declare(strict_types=1);

use App\Actions\ShoppingList\RecalculateListStatusAction;
use App\Actions\ShoppingListItem\AddItemAction;
use App\Actions\ShoppingListItem\CheckItemAction;
use App\Actions\ShoppingListItem\DeleteItemAction;
use App\Actions\ShoppingListItem\UpdateItemAction;
use App\Data\ShoppingListItemData;
use App\Enums\TaskStatus;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;

/*
 * Автодеривация статуса задачи (type='tasks') из статусов её пунктов и
 * инвариант done ⇔ is_checked / is_completed — на уровне Actions домена.
 */

it('derives InProgress for the list when any item becomes in_progress', function (): void {
    $list = ShoppingList::factory()->tasks()->create();
    ShoppingListItem::factory()->forList($list)->create();
    $item = ShoppingListItem::factory()->forList($list)->done()->create();

    app(UpdateItemAction::class)($item, new ShoppingListItemData(
        name: $item->name,
        status: TaskStatus::InProgress,
    ));

    $list->refresh();
    expect($list->status)->toBe(TaskStatus::InProgress)
        ->and($list->is_completed)->toBeFalse();
});

it('derives Done with is_completed=true when every item is done', function (): void {
    $list = ShoppingList::factory()->tasks()->create();
    ShoppingListItem::factory()->forList($list)->done()->create();
    $item = ShoppingListItem::factory()->forList($list)->create();

    app(UpdateItemAction::class)($item, new ShoppingListItemData(
        name: $item->name,
        status: TaskStatus::Done,
    ));

    $list->refresh();
    expect($list->status)->toBe(TaskStatus::Done)
        ->and($list->is_completed)->toBeTrue();
});

it('derives Postponed when every item is postponed', function (): void {
    $list = ShoppingList::factory()->tasks()->create();
    ShoppingListItem::factory()->forList($list)->postponed()->create();
    $item = ShoppingListItem::factory()->forList($list)->create();

    app(UpdateItemAction::class)($item, new ShoppingListItemData(
        name: $item->name,
        status: TaskStatus::Postponed,
    ));

    $list->refresh();
    expect($list->status)->toBe(TaskStatus::Postponed)
        ->and($list->is_completed)->toBeFalse();
});

it('derives New for a done and postponed mix without in_progress', function (): void {
    $list = ShoppingList::factory()->tasks()->create();
    ShoppingListItem::factory()->forList($list)->done()->create();
    $item = ShoppingListItem::factory()->forList($list)->inProgress()->create();

    app(UpdateItemAction::class)($item, new ShoppingListItemData(
        name: $item->name,
        status: TaskStatus::Postponed,
    ));

    $list->refresh();
    expect($list->status)->toBe(TaskStatus::New)
        ->and($list->is_completed)->toBeFalse();
});

it('recalculates the list status when an item is added', function (): void {
    $list = ShoppingList::factory()->tasks()->create();
    ShoppingListItem::factory()->forList($list)->done()->create();

    // Список [done] → done; добавление пункта in_progress → in_progress.
    app(RecalculateListStatusAction::class)($list);
    expect($list->refresh()->status)->toBe(TaskStatus::Done);

    app(AddItemAction::class)($list, new ShoppingListItemData(
        name: 'Next step',
        status: TaskStatus::InProgress,
    ));

    $list->refresh();
    expect($list->status)->toBe(TaskStatus::InProgress)
        ->and($list->is_completed)->toBeFalse();
});

it('recalculates the list status when an item is deleted', function (): void {
    $list = ShoppingList::factory()->tasks()->create();
    ShoppingListItem::factory()->forList($list)->done()->create();
    $pending = ShoppingListItem::factory()->forList($list)->create();

    // [done, new] → New; после удаления new остаётся [done] → Done.
    app(DeleteItemAction::class)($pending);

    $list->refresh();
    expect($list->status)->toBe(TaskStatus::Done)
        ->and($list->is_completed)->toBeTrue();
});

it('recalculates the list status when the last item is deleted', function (): void {
    $list = ShoppingList::factory()->tasks()->create();
    $item = ShoppingListItem::factory()->forList($list)->done()->create();

    app(RecalculateListStatusAction::class)($list);
    expect($list->refresh()->status)->toBe(TaskStatus::Done);

    app(DeleteItemAction::class)($item);

    $list->refresh();
    expect($list->status)->toBe(TaskStatus::New)
        ->and($list->is_completed)->toBeFalse();
});

it('enforces is_checked=true when an item status is set to done', function (): void {
    $list = ShoppingList::factory()->tasks()->create();
    $item = ShoppingListItem::factory()->forList($list)->create(['is_checked' => false]);

    $updated = app(UpdateItemAction::class)($item, new ShoppingListItemData(
        name: $item->name,
        status: TaskStatus::Done,
    ));

    expect($updated->status)->toBe(TaskStatus::Done)
        ->and($updated->is_checked)->toBeTrue();
});

it('checks an item into done and recalculates the parent task', function (): void {
    $list = ShoppingList::factory()->tasks()->create();
    ShoppingListItem::factory()->forList($list)->done()->create();
    $item = ShoppingListItem::factory()->forList($list)->create();

    app(CheckItemAction::class)($item, true);

    expect($item->refresh()->status)->toBe(TaskStatus::Done)
        ->and($item->is_checked)->toBeTrue();

    $list->refresh();
    expect($list->status)->toBe(TaskStatus::Done)
        ->and($list->is_completed)->toBeTrue();
});

it('unchecking a done item resets its status to new', function (): void {
    $list = ShoppingList::factory()->tasks()->create();
    $item = ShoppingListItem::factory()->forList($list)->done()->create();

    app(CheckItemAction::class)($item, false);

    expect($item->refresh()->status)->toBe(TaskStatus::New)
        ->and($item->is_checked)->toBeFalse();

    expect($list->refresh()->status)->toBe(TaskStatus::New);
});

it('unchecking keeps a non-done item status (postponed stays postponed)', function (): void {
    $list = ShoppingList::factory()->tasks()->create();
    $item = ShoppingListItem::factory()->forList($list)->postponed()->create();

    app(CheckItemAction::class)($item, false);

    expect($item->refresh()->status)->toBe(TaskStatus::Postponed)
        ->and($item->is_checked)->toBeFalse();
});

it('does not derive a status for goods lists (no-op derivation)', function (): void {
    $list = ShoppingList::factory()->create(); // type='goods' по умолчанию
    $item = ShoppingListItem::factory()->forList($list)->create();

    app(CheckItemAction::class)($item, true);

    // Пункт goods отмечен, но статусы остаются номинальными 'new'.
    expect($item->refresh()->is_checked)->toBeTrue()
        ->and($item->status)->toBe(TaskStatus::New);

    $list->refresh();
    expect($list->status)->toBe(TaskStatus::New)
        ->and($list->is_completed)->toBeFalse()
        ->and($list->status_is_manual)->toBeFalse();
});

it('ignores an explicit item status for goods lists', function (): void {
    $list = ShoppingList::factory()->create();

    $item = app(AddItemAction::class)($list, new ShoppingListItemData(
        name: 'Milk',
        status: TaskStatus::InProgress,
    ));

    // В БД остаётся default 'new' — статус для goods номинален.
    expect($item->refresh()->status)->toBe(TaskStatus::New)
        ->and($item->is_checked)->toBeFalse();
});

it('keeps factory task states consistent with the done invariant', function (): void {
    $done = ShoppingList::factory()->done()->create();
    $inProgress = ShoppingList::factory()->inProgress()->create();
    $postponed = ShoppingList::factory()->postponed()->create();
    $doneItem = ShoppingListItem::factory()->done()->create();

    // Инвариант backfill/фабрик: done ⇔ is_completed / is_checked
    // (refresh — is_completed выставляется default'ом на уровне БД).
    expect($done->status)->toBe(TaskStatus::Done)
        ->and($done->is_completed)->toBeTrue()
        ->and($done->status_is_manual)->toBeTrue()
        ->and($inProgress->refresh()->is_completed)->toBeFalse()
        ->and($postponed->refresh()->is_completed)->toBeFalse()
        ->and($doneItem->status)->toBe(TaskStatus::Done)
        ->and($doneItem->is_checked)->toBeTrue();
});
