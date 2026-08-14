<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ShoppingListItemComment;
use App\Models\User;

final class ShoppingListItemCommentPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, ShoppingListItemComment $comment): bool
    {
        return $this->owns($user, $comment);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function delete(User $user, ShoppingListItemComment $comment): bool
    {
        return $this->owns($user, $comment);
    }

    /**
     * Владение определяется по денормализованному user_id комментария
     * (равен user_id строки задачи — см. AddItemCommentAction).
     */
    private function owns(User $user, ShoppingListItemComment $comment): bool
    {
        return $user->id === $comment->user_id;
    }
}
