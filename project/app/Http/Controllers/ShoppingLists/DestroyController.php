<?php

declare(strict_types=1);

namespace App\Http\Controllers\ShoppingLists;

use App\Actions\ShoppingList\DeleteListAction;
use App\Http\Controllers\Controller;
use App\Models\ShoppingList;
use Illuminate\Http\Response;

final class DestroyController extends Controller
{
    public function __construct(
        private readonly DeleteListAction $deleteList,
    ) {}

    public function __invoke(ShoppingList $shoppingList): Response
    {
        $this->authorize('delete', $shoppingList);

        ($this->deleteList)($shoppingList);

        return response()->noContent();
    }
}
