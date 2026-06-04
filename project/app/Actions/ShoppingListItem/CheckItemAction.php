<?php

declare(strict_types=1);

namespace App\Actions\ShoppingListItem;

use App\Models\ShoppingListItem;

final class CheckItemAction
{
    /**
     * Переключает отметку элемента (FR-14): is_checked = $checked.
     */
    public function __invoke(ShoppingListItem $item, bool $checked): ShoppingListItem
    {
        $item->update(['is_checked' => $checked]);

        return $item;
    }
}
