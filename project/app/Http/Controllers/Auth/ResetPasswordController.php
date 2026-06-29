<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\ResetUserPasswordAction;
use App\Data\ResetPasswordData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ResetPasswordRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

/**
 * POST /api/v1/auth/password/reset
 *
 * Сбрасывает пароль по токену из письма.
 *
 * Accept: application/json
 */
final class ResetPasswordController extends Controller
{
    public function __construct(
        private readonly ResetUserPasswordAction $resetPassword,
    ) {}

    public function __invoke(ResetPasswordRequest $request): JsonResponse
    {
        $status = ($this->resetPassword)(new ResetPasswordData(
            email: $request->string('email')->toString(),
            token: $request->string('token')->toString(),
            password: $request->string('password')->toString(),
        ));

        return match ($status) {
            Password::PASSWORD_RESET  => response()->json([
                'message' => 'Пароль обновлён. Войдите с новым паролем.',
            ]),
            Password::RESET_THROTTLED => throw ValidationException::withMessages([
                'email' => ['Слишком часто. Попробуйте позже.'],
            ]),
            default => throw ValidationException::withMessages([
                'token' => ['Ссылка недействительна или устарела. Запросите новую.'],
            ]),
        };
    }
}
