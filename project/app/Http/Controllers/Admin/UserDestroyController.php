<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\User\DeleteUserAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\DeleteUserRequest;
use App\Models\User;
use Illuminate\Http\Response;

/**
 * DELETE /api/v1/admin/users/{user}
 *
 * Soft-deletes a user account and revokes all tokens.
 * Returns 204 No Content on success.
 * Requires superadmin middleware + guards in DeleteUserRequest.
 */
final class UserDestroyController extends Controller
{
    public function __construct(
        private readonly DeleteUserAction $action,
    ) {}

    public function __invoke(DeleteUserRequest $request, User $user): Response
    {
        ($this->action)($user);

        return response()->noContent();
    }
}
