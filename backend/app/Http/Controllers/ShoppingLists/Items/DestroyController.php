<?php

declare(strict_types=1);

namespace App\Http\Controllers\ShoppingLists\Items;

use App\Actions\ShoppingListItem\DeleteItemAction;
use App\Http\Controllers\Controller;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use Illuminate\Http\Response;

final class DestroyController extends Controller
{
    public function __construct(
        private readonly DeleteItemAction $deleteItem,
    ) {}

    public function __invoke(ShoppingList $shoppingList, ShoppingListItem $item): Response
    {
        $this->authorize('delete', $item);

        ($this->deleteItem)($item);

        return response()->noContent();
    }
}
