<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Device;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Публичное представление устройства (FR-35). Внутренний id и user_id
 * намеренно не экспонируются: устройство адресуется только публичным uuid.
 *
 * @mixin Device
 */
final class DeviceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'name' => $this->name,
            'last_synced_revision' => $this->last_synced_revision,
            'last_synced_at' => $this->last_synced_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
