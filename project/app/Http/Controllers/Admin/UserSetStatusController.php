<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\User\SetUserActiveAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SetUserStatusRequest;
use App\Http\Resources\AdminUserResource;
use App\Models\User;

/**
 * PATCH /api/v1/admin/users/{user}/status
 *
 * Activates or deactivates a user account.
 * Requires superadmin middleware + guards in SetUserStatusRequest.
 */
final class UserSetStatusController extends Controller
{
    public function __construct(
        private readonly SetUserActiveAction $action,
    ) {}

    public function __invoke(SetUserStatusRequest $request, User $user): AdminUserResource
    {
        $user = ($this->action)($user, $request->boolean('is_active'));

        $user->loadCount(['notes', 'reminders', 'shoppingLists']);

        return AdminUserResource::make($user);
    }
}
