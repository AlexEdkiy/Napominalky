<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\User\IssueTokenAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

final class LoginController extends Controller
{
    private const string DEFAULT_DEVICE_NAME = 'api';

    public function __construct(
        private readonly IssueTokenAction $issueToken,
    ) {}

    public function __invoke(LoginRequest $request): JsonResponse
    {
        $user = User::firstWhere('email', $request->string('email')->toString());

        if ($user === null || ! Hash::check($request->string('password')->toString(), $user->password)) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        if (! $user->isActive()) {
            abort(HttpResponse::HTTP_FORBIDDEN, 'Аккаунт отключён. Обратитесь к администратору.');
        }

        $deviceName = $request->filled('device_name')
            ? $request->string('device_name')->toString()
            : self::DEFAULT_DEVICE_NAME;

        $this->registerDevice($user, $deviceName);

        $token = ($this->issueToken)($user, $deviceName);

        return response()->json([
            'data' => [
                'token' => $token,
                'token_type' => 'Bearer',
                'user' => new UserResource($user),
            ],
        ], HttpResponse::HTTP_OK);
    }

    private function registerDevice(User $user, string $deviceName): void
    {
        $user->devices()->firstOrCreate(['name' => $deviceName]);
    }
}
