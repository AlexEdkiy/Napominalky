<?php

declare(strict_types=1);

namespace App\Http\Controllers\ShoppingLists;

use App\Actions\ShoppingList\CreateListAction;
use App\Data\ShoppingListData;
use App\Http\Controllers\Controller;
use App\Http\Requests\ShoppingList\StoreListRequest;
use App\Http\Resources\ShoppingListResource;
use App\Models\ShoppingList;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class StoreController extends Controller
{
    public function __construct(
        private readonly CreateListAction $createList,
    ) {}

    public function __invoke(StoreListRequest $request): JsonResponse
    {
        $this->authorize('create', ShoppingList::class);

        // Клиентский uuid (offline-создание) пробрасывается в Action для
        // sync-идемпотентности; иначе HasUuid сгенерирует серверный uuid.
        $uuid = $request->filled('uuid')
            ? $request->string('uuid')->toString()
            : null;

        $data = new ShoppingListData(
            title: $request->string('title')->toString(),
            type: $request->filled('type') ? $request->string('type')->toString() : 'goods',
        );

        $list = ($this->createList)($request->user(), $data, $uuid);

        return ShoppingListResource::make($list)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }
}
