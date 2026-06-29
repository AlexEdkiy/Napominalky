<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\SendPasswordResetLinkAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use Illuminate\Http\JsonResponse;

/**
 * POST /api/v1/auth/password/forgot
 *
 * Запрашивает ссылку сброса пароля по email.
 * Ответ всегда обобщённый 200 — не раскрывает существование email.
 *
 * Accept: application/json
 */
final class ForgotPasswordController extends Controller
{
    public function __construct(
        private readonly SendPasswordResetLinkAction $sendResetLink,
    ) {}

    public function __invoke(ForgotPasswordRequest $request): JsonResponse
    {
        ($this->sendResetLink)($request->string('email')->toString());

        return response()->json([
            'message' => 'Если такой адрес зарегистрирован, мы отправили ссылку для сброса пароля.',
        ]);
    }
}
