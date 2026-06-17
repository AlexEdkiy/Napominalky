<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Extended User representation for admin panel endpoints.
 * Includes aggregate counters loaded via withCount / loadCount.
 *
 * @mixin User
 */
final class AdminUserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'name' => $this->name,
            'email' => $this->email,
            'is_admin' => $this->is_admin,
            'is_super_admin' => $this->is_super_admin,
            'is_active' => $this->is_active,
            'sync_enabled' => $this->sync_enabled,
            'created_at' => $this->created_at?->toISOString(),
            'notes_count' => $this->whenNotNull($this->notes_count),
            'reminders_count' => $this->whenNotNull($this->reminders_count),
            'lists_count' => $this->whenNotNull($this->shopping_lists_count),
        ];
    }
}
