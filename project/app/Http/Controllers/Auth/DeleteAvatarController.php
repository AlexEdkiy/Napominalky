<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\User\DeleteAvatarAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;

/**
 * DELETE /api/v1/auth/me/avatar — удаление аватара текущего пользователя.
 *
 * Удаляет файл с приватного диска и обнуляет avatar_path.
 * Accept: application/json.
 */
final class DeleteAvatarController extends Controller
{
    public function __construct(
        private readonly DeleteAvatarAction $deleteAvatar,
    ) {}

    public function __invoke(Request $request): UserResource
    {
        $user = ($this->deleteAvatar)($request->user());

        return new UserResource($user);
    }
}
