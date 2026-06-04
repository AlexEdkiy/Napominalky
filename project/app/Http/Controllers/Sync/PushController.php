<?php

declare(strict_types=1);

namespace App\Http\Controllers\Sync;

use App\Actions\Device\RegisterDeviceAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sync\PushRequest;
use App\Http\Resources\Sync\SyncPushResultResource;
use App\Services\Sync\SyncPushService;

/**
 * Delta-push синхронизации: POST /api/v1/sync/push.
 *
 * Применяет клиентский outbox-батч (Last-Write-Wins, FR-37) и регистрирует
 * устройство-источник с полученным курсором, чтобы следующий pull(since=cursor)
 * не вернул клиенту его же только что применённые записи.
 *
 * Авторизация — только аутентификация (auth:sanctum). Данные скоупятся по
 * текущему пользователю внутри SyncPushService.
 */
final class PushController extends Controller
{
    public function __construct(
        private readonly SyncPushService $syncPush,
        private readonly RegisterDeviceAction $registerDevice,
    ) {}

    public function __invoke(PushRequest $request): SyncPushResultResource
    {
        $user = $request->user();

        $result = $this->syncPush->push($user, $request->changeDtos());

        ($this->registerDevice)(
            $user,
            $request->string('device_uuid')->toString(),
            $request->filled('device_name') ? $request->string('device_name')->toString() : null,
            $result->cursor,
        );

        return new SyncPushResultResource($result);
    }
}
