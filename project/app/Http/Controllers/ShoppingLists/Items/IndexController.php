<?php

declare(strict_types=1);

namespace App\Http\Controllers\ShoppingLists\Items;

use App\Http\Controllers\Controller;
use App\Http\Resources\ShoppingListItemResource;
use App\Models\ShoppingList;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class IndexController extends Controller
{
    private const int DEFAULT_PER_PAGE = 50;

    public function __invoke(ShoppingList $shoppingList): AnonymousResourceCollection
    {
        $this->authorize('view', $shoppingList);

        $items = $shoppingList->items()
            ->orderBy('position')
            ->paginate(self::DEFAULT_PER_PAGE);

        return ShoppingListItemResource::collection($items);
    }
}
