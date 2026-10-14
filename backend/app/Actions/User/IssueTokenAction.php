<?php

declare(strict_types=1);

namespace App\Actions\User;

use App\Models\User;

final class IssueTokenAction
{
    public function __invoke(User $user, string $deviceName): string
    {
        $user->ensureEmailVerified();

        return $user->createToken($deviceName)->plainTextToken;
    }
}
