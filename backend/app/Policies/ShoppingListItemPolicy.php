<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ShoppingListItem;
use App\Models\User;

final class ShoppingListItemPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, ShoppingListItem $item): bool
    {
        return $this->owns($user, $item);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, ShoppingListItem $item): bool
    {
        return $this->owns($user, $item);
    }

    public function delete(User $user, ShoppingListItem $item): bool
    {
        return $this->owns($user, $item);
    }

    /**
     * Владение определяется по денормализованному user_id элемента
     * (равен user_id родительского списка — см. AddItemAction).
     */
    private function owns(User $user, ShoppingListItem $item): bool
    {
        return $user->id === $item->user_id;
    }
}
