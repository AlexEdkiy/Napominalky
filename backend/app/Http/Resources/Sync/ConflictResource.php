<?php

declare(strict_types=1);

namespace App\Http\Resources\Sync;

use App\Models\SyncConflict;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Публичное представление спорной записи (FR-37): обе версии конфликта
 * и время фиксации/разрешения. Внутренний id и user_id не экспонируются.
 *
 * @mixin SyncConflict
 */
final class ConflictResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'entity_type' => $this->entity_type,
            'entity_uuid' => $this->entity_uuid,
            'server_payload' => $this->server_payload,
            'client_payload' => $this->client_payload,
            'resolved_at' => $this->resolved_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
