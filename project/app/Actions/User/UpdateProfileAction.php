<?php

declare(strict_types=1);

namespace App\Actions\User;

use App\Data\ProfileData;
use App\Models\User;

final class UpdateProfileAction
{
    public function __invoke(User $user, ProfileData $data): User
    {
        if ($user->email !== $data->email) {
            // Верификация email в приложении не используется, но отметку
            // о подтверждении старого адреса на новый не переносим.
            $user->email_verified_at = null;
        }

        $user->name = $data->name;
        $user->email = $data->email;
        $user->save();

        return $user;
    }
}
