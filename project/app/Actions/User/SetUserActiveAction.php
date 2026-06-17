<?php

declare(strict_types=1);

namespace App\Actions\User;

use App\Models\User;

final class SetUserActiveAction
{
    public function __invoke(User $user, bool $active): User
    {
        $user->is_active = $active;
        $user->save();

        if (! $active) {
            $user->revokeTokens();
        }

        return $user;
    }
}
