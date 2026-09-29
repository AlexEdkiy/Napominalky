<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ShoppingList;
use App\Models\User;

final class ShoppingListPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, ShoppingList $list): bool
    {
        return $this->owns($user, $list);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, ShoppingList $list): bool
    {
        return $this->owns($user, $list);
    }

    public function delete(User $user, ShoppingList $list): bool
    {
        return $this->owns($user, $list);
    }

    private function owns(User $user, ShoppingList $list): bool
    {
        return $user->id === $list->user_id;
    }
}
