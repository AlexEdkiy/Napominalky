<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\User\SetUserRolesAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SetUserRolesRequest;
use App\Http\Resources\AdminUserResource;
use App\Models\User;

/**
 * PATCH /api/v1/admin/users/{user}/roles
 *
 * Updates is_admin and is_super_admin flags.
 * Note: if is_super_admin=true is sent with is_admin=false,
 * is_admin is forced to true (super-admin implies admin).
 * Requires superadmin middleware + guards in SetUserRolesRequest.
 */
final class UserRolesController extends Controller
{
    public function __construct(
        private readonly SetUserRolesAction $action,
    ) {}

    public function __invoke(SetUserRolesRequest $request, User $user): AdminUserResource
    {
        /** @var array{is_admin: bool, is_super_admin: bool} $data */
        $data = $request->validated();

        $user = ($this->action)($user, $data['is_admin'], $data['is_super_admin']);

        $user->loadCount(['notes', 'reminders', 'shoppingLists']);

        return AdminUserResource::make($user);
    }
}
