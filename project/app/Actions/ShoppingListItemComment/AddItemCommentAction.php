<?php

declare(strict_types=1);

namespace App\Actions\ShoppingListItemComment;

use App\Data\ShoppingListItemCommentData;
use App\Models\ShoppingListItem;
use App\Models\ShoppingListItemComment;
use App\Models\User;

final class AddItemCommentAction
{
    public function __invoke(
        ShoppingListItem $item,
        User $author,
        ShoppingListItemCommentData $data,
    ): ShoppingListItemComment {
        $comment = $item->comments()->make([
            'author_name' => $author->name,
            'body' => $data->body,
        ]);

        // user_id денормализуется из владельца строки для sync-фильтра.
        $comment->user_id = $item->user_id;

        // Клиентский uuid (offline-создание) — до save; HasUuid (??=) сам
        // сгенерирует значение, если uuid не передан.
        if ($data->uuid !== null) {
            $comment->uuid = $data->uuid;
        }

        $comment->save();

        return $comment;
    }
}
