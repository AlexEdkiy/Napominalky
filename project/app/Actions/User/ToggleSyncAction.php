<?php

declare(strict_types=1);

namespace App\Actions\User;

use App\Models\User;

final class ToggleSyncAction
{
    public function __invoke(User $user, bool $enabled): User
    {
        $user->sync_enabled = $enabled;
        $user->save();

        return $user;
    }
}
