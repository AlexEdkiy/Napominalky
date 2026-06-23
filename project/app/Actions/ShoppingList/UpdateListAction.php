<?php

declare(strict_types=1);

namespace App\Actions\ShoppingList;

use App\Data\ShoppingListData;
use App\Models\ShoppingList;

final class UpdateListAction
{
    public function __invoke(ShoppingList $list, ShoppingListData $data): ShoppingList
    {
        $list->update([
            'title' => $data->title,
            'type' => $data->type,
            'tags' => $data->tags,
        ]);

        return $list;
    }
}
