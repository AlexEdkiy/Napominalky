<?php

declare(strict_types=1);

namespace App\Actions\User;

use App\Data\RegisterData;
use App\Models\User;

final class RegisterUserAction
{
    public function __invoke(RegisterData $data): User
    {
        return User::create([
            'name' => $data->name,
            'email' => $data->email,
            'password' => $data->password,
        ]);
    }
}
