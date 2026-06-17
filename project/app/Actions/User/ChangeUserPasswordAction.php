<?php

declare(strict_types=1);

namespace App\Actions\User;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

final class ChangeUserPasswordAction
{
    public function __invoke(User $user, string $plainPassword): User
    {
        $user->password = Hash::make($plainPassword);
        $user->save();

        $user->revokeTokens();

        return $user;
    }
}
