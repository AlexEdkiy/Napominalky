<?php

declare(strict_types=1);

namespace App\Http\Controllers\ShoppingLists\Items;

use App\Actions\ShoppingListItem\CheckItemAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\ShoppingListItem\CheckItemRequest;
use App\Http\Resources\ShoppingListItemResource;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;

final class CheckController extends Controller
{
    public function __construct(
        private readonly CheckItemAction $checkItem,
    ) {}

    public function __invoke(
        CheckItemRequest $request,
        ShoppingList $shoppingList,
        ShoppingListItem $item,
    ): ShoppingListItemResource {
        $this->authorize('update', $item);

        $updated = ($this->checkItem)($item, $request->boolean('is_checked'));

        // comments_count обязателен в контракте ресурса пункта (без ленивого подсчёта);
        // тред comments — тоже (MBE-22): веб заменяет пункт ответом целиком, и без
        // relation тред «пропадал» после check/update при живом счётчике.
        $updated->loadCount('comments')
            ->load(['comments' => static fn ($query) => $query->orderBy('created_at')->orderBy('id')]);

        return ShoppingListItemResource::make($updated);
    }
}
