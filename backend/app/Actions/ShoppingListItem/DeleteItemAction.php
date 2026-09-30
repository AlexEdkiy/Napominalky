<?php

declare(strict_types=1);

namespace App\Actions\ShoppingListItem;

use App\Actions\ShoppingList\RecalculateListStatusAction;
use App\Models\ShoppingListItem;
use Illuminate\Support\Facades\DB;

final class DeleteItemAction
{
    public function __construct(
        private readonly RecalculateListStatusAction $recalculateStatus,
    ) {}

    public function __invoke(ShoppingListItem $item): void
    {
        DB::transaction(function () use ($item): void {
            $list = $item->shoppingList;

            $item->delete();

            // Удалённый пункт больше не участвует в деривации статуса задачи
            // (items() исключает soft-deleted строки).
            if ($list !== null) {
                ($this->recalculateStatus)($list);
            }
        });
    }
}
