<?php

declare(strict_types=1);

namespace App\Actions\Device;

use App\Models\Device;
use App\Models\User;

/**
 * Регистрирует устройство пользователя для мульти-девайс синхронизации.
 *
 * Идемпотентно по (user_id, device_uuid): повторный вызов того же устройства
 * обновляет курсор last_synced_revision и отметку last_synced_at, а не создаёт
 * дубль. name обновляется только при передаче (не затирается на null при
 * последующих sync-вызовах); у нового устройства без имени ставится дефолт,
 * т.к. колонка name NOT NULL. См. docs/architecture «Группа 1», «Группа 7».
 */
final class RegisterDeviceAction
{
    public function __invoke(
        User $user,
        string $deviceUuid,
        ?string $name,
        int $lastSyncedRevision,
    ): Device {
        // uuid вне $fillable и имеет авто-генерацию на creating — матчим и
        // задаём явно через forceFill, чтобы сохранить клиентский device_uuid.
        $device = $user->devices()->where('uuid', $deviceUuid)->first()
            ?? $user->devices()->make();
        $device->forceFill(['uuid' => $deviceUuid]);

        if ($name !== null) {
            $device->name = $name;
        } elseif (! $device->exists) {
            $device->name = 'Device';
        }

        $device->last_synced_revision = $lastSyncedRevision;
        $device->last_synced_at = now();
        $device->save();

        return $device;
    }
}
