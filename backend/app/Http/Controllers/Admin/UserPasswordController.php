<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\User\ChangeUserPasswordAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ChangeUserPasswordRequest;
use App\Models\User;
use Illuminate\Http\Response;

/**
 * PATCH /api/v1/admin/users/{user}/password
 *
 * Changes user password and revokes all existing tokens.
 * Returns 204 No Content on success.
 * Requires superadmin middleware + guard (cannot change own password).
 */
final class UserPasswordController extends Controller
{
    public function __construct(
        private readonly ChangeUserPasswordAction $action,
    ) {}

    public function __invoke(ChangeUserPasswordRequest $request, User $user): Response
    {
        ($this->action)($user, $request->string('password')->value());

        return response()->noContent();
    }
}
