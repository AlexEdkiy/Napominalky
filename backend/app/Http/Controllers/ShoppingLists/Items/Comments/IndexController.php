<?php

declare(strict_types=1);

namespace App\Http\Controllers\ShoppingLists\Items\Comments;

use App\Http\Controllers\Controller;
use App\Http\Resources\ShoppingListItemCommentResource;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class IndexController extends Controller
{
    /**
     * Тред комментариев строки задачи — хронологический порядок (ASC),
     * id как tie-breaker при равных created_at. Без пагинации: тред
     * ограничен по объёму и отдаётся целиком.
     */
    public function __invoke(
        ShoppingList $shoppingList,
        ShoppingListItem $item,
    ): AnonymousResourceCollection {
        // Право читать тред = право видеть родительский список.
        $this->authorize('view', $shoppingList);

        $comments = $item->comments()
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        return ShoppingListItemCommentResource::collection($comments);
    }
}
