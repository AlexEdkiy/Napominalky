<?php

declare(strict_types=1);

namespace App\Actions\User;

use App\Models\User;

final class SetUserRolesAction
{
    public function __invoke(User $user, bool $isAdmin, bool $isSuperAdmin): User
    {
        $user->is_admin = $isAdmin;
        $user->is_super_admin = $isSuperAdmin;
        $user->save();

        return $user;
    }
}
