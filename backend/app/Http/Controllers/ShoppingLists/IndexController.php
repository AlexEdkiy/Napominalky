<?php

declare(strict_types=1);

namespace App\Http\Controllers\ShoppingLists;

use App\Http\Controllers\Controller;
use App\Http\Requests\ShoppingList\IndexListRequest;
use App\Http\Resources\ShoppingListResource;
use App\Models\ShoppingList;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class IndexController extends Controller
{
    private const int DEFAULT_PER_PAGE = 15;

    public function __invoke(IndexListRequest $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', ShoppingList::class);

        $lists = $request->user()->shoppingLists()
            ->active()
            ->withProgress()
            ->orderByDesc('updated_at')
            ->paginate($this->resolvePerPage($request));

        return ShoppingListResource::collection($lists);
    }

    private function resolvePerPage(IndexListRequest $request): int
    {
        return (int) ($request->integer('per_page') ?: self::DEFAULT_PER_PAGE);
    }
}
