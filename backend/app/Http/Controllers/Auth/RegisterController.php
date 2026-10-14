<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\SendVerificationEmailAction;
use App\Actions\User\RegisterUserAction;
use App\Data\RegisterData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class RegisterController extends Controller
{
    public function __construct(
        private readonly RegisterUserAction $registerUser,
        private readonly SendVerificationEmailAction $sendVerification,
    ) {}

    public function __invoke(RegisterRequest $request): JsonResponse
    {
        $user = ($this->registerUser)(new RegisterData(
            name: $request->string('name')->toString(),
            email: $request->string('email')->toString(),
            password: $request->string('password')->toString(),
        ));

        $sent = ($this->sendVerification)($user);

        return response()->json([
            'data' => [
                'verification_required' => true,
                'email' => $user->email,
                'email_sent' => $sent,
                'message' => $sent
                    ? 'Откройте письмо и подтвердите почту по ссылке. Затем вернитесь и войдите в аккаунт.'
                    : 'Аккаунт создан, но письмо не отправлено. Попробуйте отправить его повторно позже.',
            ],
        ], Response::HTTP_CREATED);
    }
}
