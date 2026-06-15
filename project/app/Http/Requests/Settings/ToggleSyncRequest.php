<?php

declare(strict_types=1);

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

final class ToggleSyncRequest extends FormRequest
{
    /**
     * Authorization is handled at the middleware level (auth:sanctum).
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'sync_enabled' => ['required', 'boolean'],
        ];
    }
}
