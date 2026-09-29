<?php

declare(strict_types=1);

namespace App\Http\Controllers\ShoppingLists\Items;

use App\Actions\ShoppingListItem\AddItemAction;
use App\Data\ShoppingListItemData;
use App\Enums\ShoppingCategory;
use App\Enums\TaskStatus;
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

        // comments_count обязателен в контракте ресурса пункта (без ленивого подсчёта);
        // тред comments — тоже (MBE-22): веб заменяет пункт ответом целиком, и без
        // relation тред «пропадал» после check/update при живом счётчике.
        $item->loadCount('comments')
            ->load(['comments' => static fn ($query) => $query->orderBy('created_at')->orderBy('id')]);

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
            status: $request->filled('status')
                ? TaskStatus::from($request->string('status')->toString())
                : null,
            position: (int) $request->integer('position'),
            quantity: $request->filled('quantity') ? (int) $request->integer('quantity') : 1,
            deadline: $request->filled('deadline') ? $request->string('deadline')->toString() : null,
            reminderAt: $request->filled('reminder_at') ? $request->string('reminder_at')->toString() : null,
            link: $request->filled('link') ? $request->string('link')->toString() : null,
            comment: $request->filled('comment') ? $request->string('comment')->toString() : null,
            tags: $request->filled('tags') ? $request->string('tags')->toString() : null,
        );
    }
}
