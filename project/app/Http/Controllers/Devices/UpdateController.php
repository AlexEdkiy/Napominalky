<?php

declare(strict_types=1);

namespace App\Http\Controllers\Devices;

use App\Http\Controllers\Controller;
use App\Http\Requests\Device\UpdateDeviceRequest;
use App\Http\Resources\DeviceResource;
use App\Models\Device;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Обновление устройства: PUT /api/v1/devices/{uuid}.
 *
 * Биндинг {device} по uuid (Device::getRouteKeyName). Чужое устройство для
 * текущего пользователя не существует — отдаём 404, не раскрывая его наличие.
 * Поля частичные: незаданное сохраняет текущее значение.
 */
final class UpdateController extends Controller
{
    public function __invoke(UpdateDeviceRequest $request, Device $device): DeviceResource
    {
        if ($device->user_id !== $request->user()->id) {
            throw new NotFoundHttpException;
        }

        if ($request->has('name')) {
            $device->name = $request->filled('name') ? $request->string('name')->toString() : $device->name;
        }

        if ($request->filled('last_synced_revision')) {
            $device->last_synced_revision = $request->integer('last_synced_revision');
        }

        $device->save();

        return DeviceResource::make($device);
    }
}
