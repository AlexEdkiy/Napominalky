<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Reminder;
use App\Models\User;

final class ReminderPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Reminder $reminder): bool
    {
        return $this->owns($user, $reminder);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Reminder $reminder): bool
    {
        return $this->owns($user, $reminder);
    }

    public function delete(User $user, Reminder $reminder): bool
    {
        return $this->owns($user, $reminder);
    }

    public function complete(User $user, Reminder $reminder): bool
    {
        return $this->owns($user, $reminder);
    }

    public function snooze(User $user, Reminder $reminder): bool
    {
        return $this->owns($user, $reminder);
    }

    private function owns(User $user, Reminder $reminder): bool
    {
        return $user->id === $reminder->user_id;
    }
}
