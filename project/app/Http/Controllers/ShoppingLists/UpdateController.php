<?php

declare(strict_types=1);

namespace App\Http\Controllers\ShoppingLists;

use App\Actions\ShoppingList\UpdateListAction;
use App\Data\ShoppingListData;
use App\Http\Controllers\Controller;
use App\Http\Requests\ShoppingList\UpdateListRequest;
use App\Http\Resources\ShoppingListResource;
use App\Models\ShoppingList;

final class UpdateController extends Controller
{
    public function __construct(
        private readonly UpdateListAction $updateList,
    ) {}

    public function __invoke(UpdateListRequest $request, ShoppingList $shoppingList): ShoppingListResource
    {
        $this->authorize('update', $shoppingList);

        $data = new ShoppingListData(
            title: $request->string('title')->toString(),
            type: $request->has('type')
                ? $request->string('type')->toString()
                : $shoppingList->type,
            tags: $request->has('tags')
                ? ($request->filled('tags') ? $request->string('tags')->toString() : null)
                : $shoppingList->tags,
            isCompleted: $request->has('is_completed')
                ? $request->boolean('is_completed')
                : $shoppingList->is_completed,
        );

        $updated = ($this->updateList)($shoppingList, $data);

        return ShoppingListResource::make($updated);
    }
}
