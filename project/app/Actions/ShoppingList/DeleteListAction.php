<?php

declare(strict_types=1);

namespace App\Actions\ShoppingList;

use App\Models\ShoppingList;

final class DeleteListAction
{
    /**
     * Мягко удаляет список (FR-18).
     *
     * Каскад БД (cascadeOnDelete на shopping_list_id) срабатывает только при
     * жёстком удалении строки. Для MVP мягкое удаление списка не трогает его
     * элементы: они остаются в таблице, но недоступны через relation активного
     * списка. Sync отдаёт tombstone списка по server_revision; чистка
     * осиротевших элементов — задача последующей итерации (sync-resolver).
     */
    public function __invoke(ShoppingList $list): void
    {
        $list->delete();
    }
}
