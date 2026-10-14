<?php

declare(strict_types=1);

namespace App\Actions\User;

use App\Data\RegisterData;
use App\Models\User;

final class RegisterUserAction
{
    public function __invoke(RegisterData $data): User
    {
        $user = new User([
            'name' => $data->name,
            'email' => $data->email,
            'password' => $data->password,
            'sync_enabled' => true,
        ]);
        $user->email_verification_required = true;
        $user->save();

        return $user;
    }
}
