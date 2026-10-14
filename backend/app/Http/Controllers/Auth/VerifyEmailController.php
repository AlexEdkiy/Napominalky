<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class VerifyEmailController extends Controller
{
    public function __invoke(Request $request, string $uuid, string $hash): JsonResponse
    {
        if (! $request->hasValidSignature(absolute: false)) {
            return response()->json(['message' => 'Ссылка недействительна или срок её действия истёк. Запросите новое письмо на экране входа.'], 403);
        }

        return DB::transaction(function () use ($uuid, $hash): JsonResponse {
            $user = User::where('uuid', $uuid)->lockForUpdate()->first();
            if ($user === null || ! $user->isActive() || ! hash_equals(sha1($user->email), $hash)) {
                return response()->json(['message' => 'Ссылка недействительна. Запросите новое письмо на экране входа.'], 403);
            }
            if ($user->email_verified_at === null) {
                $user->forceFill(['email_verified_at' => now()])->save();
                event(new Verified($user));
            }

            return response()->json(['message' => 'Почта подтверждена. Вернитесь в приложение и войдите в аккаунт.']);
        });
    }
}
