<?php

declare(strict_types=1);

namespace App\Actions\User;

use App\Data\ProfileData;
use App\Models\User;

final class UpdateProfileAction
{
    public function __invoke(User $user, ProfileData $data): User
    {
        $user->update([
            'name' => $data->name,
        ]);

        return $user;
    }
}
