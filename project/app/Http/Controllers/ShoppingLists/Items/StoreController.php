<?php

declare(strict_types=1);

namespace App\Http\Controllers\ShoppingLists\Items;

use App\Actions\ShoppingListItem\AddItemAction;
use App\Data\ShoppingListItemData;
use App\Enums\ShoppingCategory;
use App\Http\Controllers\Controller;
use App\Http\Requests\ShoppingListItem\StoreItemRequest;
use App\Http\Resources\ShoppingListItemResource;
use App\Models\ShoppingList;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class StoreController extends Controller
{
    public function __construct(
        private readonly AddItemAction $addItem,
    ) {}

    public function __invoke(StoreItemRequest $request, ShoppingList $shoppingList): JsonResponse
    {
        // Право добавлять элемент = право видеть/менять родительский список.
        $this->authorize('view', $shoppingList);

        // Клиентский uuid (offline-создание) — для sync-идемпотентности.
        $uuid = $request->filled('uuid')
            ? $request->string('uuid')->toString()
            : null;

        $item = ($this->addItem)($shoppingList, $this->toData($request), $uuid);

        return ShoppingListItemResource::make($item)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    private function toData(StoreItemRequest $request): ShoppingListItemData
    {
        return new ShoppingListItemData(
            name: $request->string('name')->toString(),
            category: $request->filled('category')
                ? ShoppingCategory::from($request->string('category')->toString())
                : ShoppingCategory::Other,
            isChecked: $request->boolean('is_checked'),
            position: (int) $request->integer('position'),
            quantity: $request->filled('quantity') ? (int) $request->integer('quantity') : 1,
            deadline: $request->filled('deadline') ? $request->string('deadline')->toString() : null,
        );
    }
}
