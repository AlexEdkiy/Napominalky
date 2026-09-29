<?php

declare(strict_types=1);

namespace App\Actions\User;

use App\Models\User;
use App\Services\AvatarService;

final class DeleteAvatarAction
{
    public function __construct(
        private readonly AvatarService $avatars,
    ) {}

    public function __invoke(User $user): User
    {
        $this->avatars->delete($user);

        $user->forceFill(['avatar_path' => null])->save();

        return $user;
    }
}
