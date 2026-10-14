<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\SendVerificationEmailAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

final class ResendVerificationController extends Controller
{
    public function __invoke(LoginRequest $request, SendVerificationEmailAction $send): JsonResponse
    {
        $user = User::firstWhere('email', $request->string('email')->toString());
        if ($user !== null && Hash::check($request->string('password')->toString(), $user->password)
            && $user->isActive() && $user->needsEmailVerification()) {
            if (! $send($user)) {
                return response()->json(['message' => 'Не удалось отправить письмо. Попробуйте позже.'], 503);
            }
        }

        return response()->json(['message' => 'Если данные верны и почта ещё не подтверждена, письмо отправлено. Проверьте также папку «Спам».']);
    }
}
