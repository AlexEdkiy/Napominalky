<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class UsersIndexController extends Controller
{
    private const int DEFAULT_PER_PAGE = 15;

    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $this->authorize('admin-access');

        $users = User::query()
            ->latest()
            ->paginate(self::DEFAULT_PER_PAGE);

        return AdminUserResource::collection($users);
    }
}
