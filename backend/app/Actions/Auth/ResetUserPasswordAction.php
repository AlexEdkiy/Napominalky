<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Data\ResetPasswordData;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

final class ResetUserPasswordAction
{
    /**
     * Reset the user password using the Password broker.
     *
     * Returns the broker status string:
     *   Password::PASSWORD_RESET  — password changed successfully
     *   Password::INVALID_USER    — no user found for the given email
     *   Password::INVALID_TOKEN   — token is invalid or expired
     *   Password::RESET_THROTTLED — too many requests
     *
     * On success:
     *   - password is updated (hashed)
     *   - remember token is rotated
     *   - PasswordReset event is fired
     *   - all Sanctum tokens are revoked (old sessions are invalidated)
     */
    public function __invoke(ResetPasswordData $data): string
    {
        return Password::reset(
            credentials: [
                'email'                 => $data->email,
                'token'                 => $data->token,
                'password'              => $data->password,
                'password_confirmation' => $data->password,
            ],
            callback: function (User $user, string $password): void {
                $user->forceFill(['password' => Hash::make($password)])
                    ->setRememberToken(Str::random(60));

                $user->save();

                event(new PasswordReset($user));

                $user->tokens()->delete();
            },
        );
    }
}
