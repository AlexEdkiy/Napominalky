<?php

declare(strict_types=1);

namespace App\Actions\User;

use App\Models\User;
use Illuminate\Support\Facades\DB;

final class DeleteAccountAction
{
    public function __invoke(User $user): void
    {
        DB::transaction(function () use ($user): void {
            $user->tokens()->delete();
            $user->devices()->delete();
            $user->delete();
        });
    }
}
