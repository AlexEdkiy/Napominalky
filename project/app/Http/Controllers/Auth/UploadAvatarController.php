<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\User\UploadAvatarAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UploadAvatarRequest;
use App\Http\Resources\UserResource;

/**
 * POST /api/v1/auth/me/avatar — загрузка аватара текущего пользователя.
 *
 * Multipart, поле avatar (jpeg/jpg/png/webp, ≤512 КБ). Файл хранится
 * на приватном диске local; клиенту возвращается data-URI в UserResource.
 * Accept: application/json.
 */
final class UploadAvatarController extends Controller
{
    public function __construct(
        private readonly UploadAvatarAction $uploadAvatar,
    ) {}

    public function __invoke(UploadAvatarRequest $request): UserResource
    {
        $user = ($this->uploadAvatar)($request->user(), $request->file('avatar'));

        return new UserResource($user);
    }
}
