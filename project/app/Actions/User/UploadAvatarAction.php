<?php

declare(strict_types=1);

namespace App\Actions\User;

use App\Models\User;
use App\Services\AvatarService;
use Illuminate\Http\UploadedFile;

final class UploadAvatarAction
{
    public function __construct(
        private readonly AvatarService $avatars,
    ) {}

    public function __invoke(User $user, UploadedFile $file): User
    {
        $path = $this->avatars->store($user, $file);

        // avatar_path не в $fillable — ставится только этим действием.
        $user->forceFill(['avatar_path' => $path])->save();

        return $user;
    }
}
