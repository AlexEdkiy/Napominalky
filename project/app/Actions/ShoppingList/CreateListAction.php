<?php

declare(strict_types=1);

namespace App\Actions\ShoppingList;

use App\Data\ShoppingListData;
use App\Models\ShoppingList;
use App\Models\User;

final class CreateListAction
{
    public function __invoke(User $user, ShoppingListData $data, ?string $uuid = null): ShoppingList
    {
        $list = new ShoppingList(['title' => $data->title]);
        $list->user_id = $user->id;

        // Клиентский uuid (offline-создание) задаётся до save; HasUuid (??=)
        // сгенерирует значение сам, если uuid не передан. Sync-идемпотентность —
        // docs/architecture «Часть 0.7».
        if ($uuid !== null) {
            $list->uuid = $uuid;
        }

        $list->save();

        return $list;
    }
}
