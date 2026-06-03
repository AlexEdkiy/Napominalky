<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Note;
use App\Models\User;

final class NotePolicy
{
    public function view(User $user, Note $note): bool
    {
        return $this->owns($user, $note);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Note $note): bool
    {
        return $this->owns($user, $note);
    }

    public function delete(User $user, Note $note): bool
    {
        return $this->owns($user, $note);
    }

    public function pin(User $user, Note $note): bool
    {
        return $this->owns($user, $note);
    }

    public function archive(User $user, Note $note): bool
    {
        return $this->owns($user, $note);
    }

    private function owns(User $user, Note $note): bool
    {
        return $user->id === $note->user_id;
    }
}
