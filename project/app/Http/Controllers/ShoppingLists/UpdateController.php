<?php

declare(strict_types=1);

namespace App\Http\Controllers\ShoppingLists;

use App\Actions\ShoppingList\UpdateListAction;
use App\Data\ShoppingListData;
use App\Enums\TaskStatus;
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
            // Частичное обновление (напр. только смена статуса из таблицы) —
            // title может не прийти: берём существующий, чтобы не затереть.
            title: $request->has('title')
                ? $request->string('title')->toString()
                : $shoppingList->title,
            type: $request->has('type')
                ? $request->string('type')->toString()
                : $shoppingList->type,
            tags: $request->has('tags')
                ? ($request->filled('tags') ? $request->string('tags')->toString() : null)
                : $shoppingList->tags,
            isCompleted: $request->has('is_completed')
                ? $request->boolean('is_completed')
                : $shoppingList->is_completed,
            status: $request->has('status')
                ? TaskStatus::from($request->string('status')->toString())
                : null,
            statusIsManual: $request->has('status_is_manual')
                ? $request->boolean('status_is_manual')
                : null,
        );

        $updated = ($this->updateList)($shoppingList, $data);

        return ShoppingListResource::make($updated);
    }
}
