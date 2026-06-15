<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use Illuminate\Http\Request;

final class UserShowController extends Controller
{
    public function __invoke(Request $request, User $user): AdminUserResource
    {
        $this->authorize('admin-access');

        $user->loadCount(['notes', 'reminders', 'shoppingLists']);

        return AdminUserResource::make($user);
    }
}
