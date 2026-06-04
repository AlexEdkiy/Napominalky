<?php

declare(strict_types=1);

namespace App\Actions\ShoppingListItem;

use App\Models\ShoppingListItem;

final class DeleteItemAction
{
    public function __invoke(ShoppingListItem $item): void
    {
        $item->delete();
    }
}
