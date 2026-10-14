<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Models\User;
use App\Notifications\VerifyAccountNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

final class SendVerificationEmailAction
{
    public function __invoke(User $user): bool
    {
        $key = 'verify-email:'.hash('sha256', mb_strtolower($user->email));
        if (! Cache::add($key, true, 60)) {
            throw ValidationException::withMessages(['email' => 'Подождите минуту перед повторной отправкой письма.']);
        }

        // Outside isolated tests, log/array/failover-to-log are not delivery.
        if (! app()->environment('testing') && ! in_array(config('mail.default'), ['smtp', 'ses', 'postmark', 'resend', 'sendmail'], true)) {
            Cache::forget($key);

            return false;
        }

        try {
            $user->notify(new VerifyAccountNotification);

            return true;
        } catch (Throwable $error) {
            Cache::forget($key);
            // Transport exception messages can contain credentials or verification URLs.
            Log::warning('Verification email delivery failed', ['exception_class' => $error::class]);

            return false;
        }
    }
}
