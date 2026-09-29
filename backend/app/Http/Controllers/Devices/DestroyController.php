<?php

declare(strict_types=1);

namespace App\Http\Controllers\Devices;

use App\Http\Controllers\Controller;
use App\Models\Device;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Удаление устройства: DELETE /api/v1/devices/{uuid}.
 *
 * Биндинг {device} по uuid (Device::getRouteKeyName). Чужое устройство для
 * текущего пользователя не существует — отдаём 404, не раскрывая его наличие.
 */
final class DestroyController extends Controller
{
    public function __invoke(Request $request, Device $device): Response
    {
        if ($device->user_id !== $request->user()->id) {
            throw new NotFoundHttpException;
        }

        $device->delete();

        return response()->noContent();
    }
}
