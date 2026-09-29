<?php

declare(strict_types=1);

namespace App\Actions\User;

use App\Models\User;

final class DeleteUserAction
{
    public function __invoke(User $user): void
    {
        $user->revokeTokens();
        $user->delete();
    }
}
