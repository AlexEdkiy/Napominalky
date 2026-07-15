<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\User\UpdateProfileAction;
use App\Data\ProfileData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;

/**
 * PATCH /api/v1/auth/me — обновление профиля текущего пользователя.
 *
 * Принимает только name (email не редактируется). Accept: application/json.
 */
final class UpdateProfileController extends Controller
{
    public function __construct(
        private readonly UpdateProfileAction $updateProfile,
    ) {}

    public function __invoke(UpdateProfileRequest $request): UserResource
    {
        $user = ($this->updateProfile)(
            $request->user(),
            new ProfileData(name: $request->validated('name')),
        );

        return new UserResource($user);
    }
}
