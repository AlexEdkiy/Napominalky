<?php

declare(strict_types=1);

namespace App\Http\Controllers\ShoppingLists\Items;

use App\Actions\ShoppingListItem\UpdateItemAction;
use App\Data\ShoppingListItemData;
use App\Enums\ShoppingCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\ShoppingListItem\UpdateItemRequest;
use App\Http\Resources\ShoppingListItemResource;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;

final class UpdateController extends Controller
{
    public function __construct(
        private readonly UpdateItemAction $updateItem,
    ) {}

    public function __invoke(
        UpdateItemRequest $request,
        ShoppingList $shoppingList,
        ShoppingListItem $item,
    ): ShoppingListItemResource {
        $this->authorize('update', $item);

        $updated = ($this->updateItem)($item, $this->toData($request, $item));

        return ShoppingListItemResource::make($updated);
    }

    /**
     * Частичное обновление: незаданные поля сохраняют текущие значения элемента.
     */
    private function toData(UpdateItemRequest $request, ShoppingListItem $item): ShoppingListItemData
    {
        return new ShoppingListItemData(
            name: $request->has('name') ? $request->string('name')->toString() : $item->name,
            category: $request->has('category')
                ? ShoppingCategory::from($request->string('category')->toString())
                : $item->category,
            isChecked: $request->has('is_checked') ? $request->boolean('is_checked') : $item->is_checked,
            position: $request->has('position') ? (int) $request->integer('position') : $item->position,
            quantity: $request->has('quantity') ? (int) $request->integer('quantity') : $item->quantity,
            deadline: $request->has('deadline')
                ? ($request->filled('deadline') ? $request->string('deadline')->toString() : null)
                : $item->deadline?->toDateString(),
            reminderAt: $request->has('reminder_at')
                ? ($request->filled('reminder_at') ? $request->string('reminder_at')->toString() : null)
                : $item->reminder_at?->toISOString(),
            link: $request->has('link')
                ? ($request->filled('link') ? $request->string('link')->toString() : null)
                : $item->link,
            comment: $request->has('comment')
                ? ($request->filled('comment') ? $request->string('comment')->toString() : null)
                : $item->comment,
            tags: $request->has('tags')
                ? ($request->filled('tags') ? $request->string('tags')->toString() : null)
                : $item->tags,
        );
    }
}
