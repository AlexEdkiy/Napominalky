<?php

declare(strict_types=1);

namespace App\Http\Controllers\Sync;

use App\Http\Controllers\Controller;
use App\Http\Resources\Sync\ConflictResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Список спорных записей текущего пользователя: GET /api/v1/sync/conflicts.
 *
 * Авторизация — только аутентификация (auth:sanctum). Выборка скоупится по
 * текущему пользователю через relation syncConflicts(); чужие конфликты
 * принципиально недоступны.
 */
final class ConflictsController extends Controller
{
    public function __invoke(Request $request): AnonymousResourceCollection
    {
        $conflicts = $request->user()
            ->syncConflicts()
            ->latest()
            ->paginate();

        return ConflictResource::collection($conflicts);
    }
}
