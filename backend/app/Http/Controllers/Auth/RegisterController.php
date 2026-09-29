<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\User\IssueTokenAction;
use App\Actions\User\RegisterUserAction;
use App\Data\RegisterData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class RegisterController extends Controller
{
    private const string DEFAULT_DEVICE_NAME = 'api';

    public function __construct(
        private readonly RegisterUserAction $registerUser,
        private readonly IssueTokenAction $issueToken,
    ) {}

    public function __invoke(RegisterRequest $request): JsonResponse
    {
        $user = ($this->registerUser)(new RegisterData(
            name: $request->string('name')->toString(),
            email: $request->string('email')->toString(),
            password: $request->string('password')->toString(),
        ));

        $token = ($this->issueToken)($user, self::DEFAULT_DEVICE_NAME);

        return response()->json([
            'data' => [
                'token' => $token,
                'token_type' => 'Bearer',
                'user' => new UserResource($user),
            ],
        ], Response::HTTP_CREATED);
    }
}
