<?php

declare(strict_types=1);

namespace App\Actions\ShoppingListItem;

use App\Data\ShoppingListItemData;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;

final class AddItemAction
{
    public function __invoke(
        ShoppingList $list,
        ShoppingListItemData $data,
        ?string $uuid = null,
    ): ShoppingListItem {
        $item = $list->items()->make([
            'name' => $data->name,
            'category' => $data->category,
            'is_checked' => $data->isChecked,
            'position' => $this->nextPosition($list, $data),
        ]);

        // user_id денормализуется из владельца списка для sync-фильтра.
        $item->user_id = $list->user_id;

        // Клиентский uuid (offline-создание) — до save; HasUuid (??=) сам
        // сгенерирует значение, если uuid не передан.
        if ($uuid !== null) {
            $item->uuid = $uuid;
        }

        $item->save();

        return $item;
    }

    /**
     * Позиция нового элемента: явно переданная клиентом либо следующая по
     * порядку (max position в списке + 1), чтобы элемент встал в конец.
     */
    private function nextPosition(ShoppingList $list, ShoppingListItemData $data): int
    {
        if ($data->position > 0) {
            return $data->position;
        }

        return (int) $list->items()->max('position') + 1;
    }
}
