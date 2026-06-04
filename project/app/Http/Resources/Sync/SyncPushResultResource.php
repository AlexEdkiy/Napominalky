<?php

declare(strict_types=1);

namespace App\Http\Resources\Sync;

use App\Data\ConflictData;
use App\Data\SyncPushResultData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Оформляет результат SyncPushService::push() в push-ответ API:
 * applied (uuid применённых записей), conflicts (обе версии спорных записей,
 * FR-37) и cursor (актуальный server_revision для следующего pull).
 *
 * @property SyncPushResultData $resource
 */
final class SyncPushResultResource extends JsonResource
{
    /**
     * Сам Resource формирует обёртку "data", поэтому статическую обёртку не
     * отключаем — но toArray() возвращает плоский payload, а $wrap='data'
     * по умолчанию даёт ровно { "data": { applied, conflicts, cursor } }.
     */
    public function __construct(SyncPushResultData $resource)
    {
        parent::__construct($resource);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'applied' => $this->resource->applied,
            'conflicts' => array_map(
                static fn (ConflictData $conflict): array => [
                    'entity_type' => $conflict->entityType,
                    'entity_uuid' => $conflict->entityUuid,
                    'server_payload' => $conflict->serverPayload,
                    'client_payload' => $conflict->clientPayload,
                ],
                $this->resource->conflicts,
            ),
            'cursor' => $this->resource->cursor,
        ];
    }
}
