<?php

declare(strict_types=1);

namespace App\Http\Controllers\Sync;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sync\ChangesRequest;
use App\Http\Resources\Sync\SyncChangesResource;
use App\Services\Sync\SyncPullService;

/**
 * Delta-pull синхронизации: GET /api/v1/sync/changes?since={revision}.
 *
 * Авторизация — только аутентификация (auth:sanctum). Policy не требуется:
 * данные скоупятся по текущему пользователю внутри SyncPullService.
 */
final class ChangesController extends Controller
{
    public function __construct(
        private readonly SyncPullService $syncPull,
    ) {}

    public function __invoke(ChangesRequest $request): SyncChangesResource
    {
        $changes = $this->syncPull->pull(
            $request->user(),
            $request->since(),
            $request->limit(),
        );

        return SyncChangesResource::fromPull($changes);
    }
}
