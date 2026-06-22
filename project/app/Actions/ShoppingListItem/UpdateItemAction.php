<?php

declare(strict_types=1);

namespace App\Actions\ShoppingListItem;

use App\Data\ShoppingListItemData;
use App\Models\ShoppingListItem;

final class UpdateItemAction
{
    public function __invoke(ShoppingListItem $item, ShoppingListItemData $data): ShoppingListItem
    {
        $item->update([
            'name' => $data->name,
            'category' => $data->category,
            'is_checked' => $data->isChecked,
            'position' => $data->position,
            'quantity' => $data->quantity,
            'deadline' => $data->deadline,
            'reminder_at' => $data->reminderAt,
            'link' => $data->link,
            'comment' => $data->comment,
            'tags' => $data->tags,
        ]);

        return $item;
    }
}
