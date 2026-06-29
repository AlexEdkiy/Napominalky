<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use Illuminate\Support\Facades\Password;

final class SendPasswordResetLinkAction
{
    /**
     * Send a password reset link to the given email address.
     *
     * Returns the broker status string:
     *   Password::RESET_LINK_SENT — link sent successfully
     *   Password::INVALID_USER    — no user found for the given email
     *   Password::RESET_THROTTLED — too many requests, try later
     */
    public function __invoke(string $email): string
    {
        return Password::sendResetLink(['email' => $email]);
    }
}
