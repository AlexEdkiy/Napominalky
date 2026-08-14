<?php

declare(strict_types=1);

namespace App\Http\Requests\ShoppingListItem;

use App\Enums\ShoppingCategory;
use App\Enums\TaskStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateItemRequest extends FormRequest
{
    /**
     * Авторизация делегируется ShoppingListItemPolicy в контроллере.
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
            'name' => ['sometimes', 'string', 'max:255'],
            'category' => ['sometimes', Rule::enum(ShoppingCategory::class)],
            'is_checked' => ['sometimes', 'boolean'],
            'status' => ['sometimes', Rule::enum(TaskStatus::class)],
            'position' => ['sometimes', 'integer', 'min:0'],
            'quantity' => ['sometimes', 'integer', 'min:1', 'max:9999'],
            'deadline' => ['sometimes', 'nullable', 'date'],
            'reminder_at' => ['sometimes', 'nullable', 'date'],
            'link' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'comment' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'tags' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }
}
