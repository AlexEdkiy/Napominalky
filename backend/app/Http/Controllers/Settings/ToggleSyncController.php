<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Actions\User\ToggleSyncAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ToggleSyncRequest;
use App\Http\Resources\UserResource;

/**
 * PATCH /api/v1/settings/sync
 *
 * Toggle cloud sync for the authenticated user.
 *
 * Request headers:
 *   Accept: application/json
 *   Authorization: Bearer {token}
 *   Content-Type: application/json
 *
 * Request body:
 *   { "sync_enabled": true|false }
 *
 * Responses:
 *   200 — UserResource (sync_enabled updated)
 *   401 — Unauthenticated
 *   422 — Validation error (sync_enabled missing or not boolean)
 */
final class ToggleSyncController extends Controller
{
    public function __construct(
        private readonly ToggleSyncAction $toggleSync,
    ) {}

    public function __invoke(ToggleSyncRequest $request): UserResource
    {
        $user = ($this->toggleSync)(
            $request->user(),
            $request->boolean('sync_enabled'),
        );

        return UserResource::make($user);
    }
}
