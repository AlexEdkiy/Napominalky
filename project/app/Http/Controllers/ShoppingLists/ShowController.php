<?php

declare(strict_types=1);

namespace App\Http\Controllers\ShoppingLists;

use App\Http\Controllers\Controller;
use App\Http\Resources\ShoppingListResource;
use App\Models\ShoppingList;

final class ShowController extends Controller
{
    public function __invoke(ShoppingList $shoppingList): ShoppingListResource
    {
        $this->authorize('view', $shoppingList);

        // Прогресс (items_count/checked_items_count) подгружается агрегатами;
        // элементы списка отдаёт отдельный эндпоинт /items (MBE-4).
        $shoppingList->loadCount([
            'items',
            'items as checked_items_count' => fn ($query) => $query->where('is_checked', true),
        ]);

        return ShoppingListResource::make($shoppingList);
    }
}
