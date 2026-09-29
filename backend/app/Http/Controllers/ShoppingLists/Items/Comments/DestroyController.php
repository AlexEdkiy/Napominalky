<?php

declare(strict_types=1);

namespace App\Http\Controllers\ShoppingLists\Items\Comments;

use App\Actions\ShoppingListItemComment\DeleteItemCommentAction;
use App\Http\Controllers\Controller;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\ShoppingListItemComment;
use Illuminate\Http\Response;

final class DestroyController extends Controller
{
    public function __construct(
        private readonly DeleteItemCommentAction $deleteComment,
    ) {}

    public function __invoke(
        ShoppingList $shoppingList,
        ShoppingListItem $item,
        ShoppingListItemComment $comment,
    ): Response {
        $this->authorize('delete', $comment);

        ($this->deleteComment)($comment);

        return response()->noContent();
    }
}
