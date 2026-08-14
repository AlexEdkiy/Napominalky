<?php

declare(strict_types=1);

namespace App\Http\Controllers\ShoppingLists\Items\Comments;

use App\Actions\ShoppingListItemComment\AddItemCommentAction;
use App\Data\ShoppingListItemCommentData;
use App\Http\Controllers\Controller;
use App\Http\Requests\ShoppingListItemComment\StoreItemCommentRequest;
use App\Http\Resources\ShoppingListItemCommentResource;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class StoreController extends Controller
{
    public function __construct(
        private readonly AddItemCommentAction $addComment,
    ) {}

    public function __invoke(
        StoreItemCommentRequest $request,
        ShoppingList $shoppingList,
        ShoppingListItem $item,
    ): JsonResponse {
        // Право комментировать = право видеть родительский список.
        $this->authorize('view', $shoppingList);

        $comment = ($this->addComment)($item, $request->user(), $this->toData($request));

        return ShoppingListItemCommentResource::make($comment)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    private function toData(StoreItemCommentRequest $request): ShoppingListItemCommentData
    {
        // Клиентский uuid (offline-создание) — для sync-идемпотентности.
        return new ShoppingListItemCommentData(
            body: $request->string('body')->toString(),
            uuid: $request->filled('uuid') ? $request->string('uuid')->toString() : null,
        );
    }
}
