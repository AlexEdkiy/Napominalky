<?php

declare(strict_types=1);

namespace App\Http\Requests\ShoppingListItem;

use App\Enums\ShoppingCategory;
use App\Enums\TaskStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreItemRequest extends FormRequest
{
    /**
     * Авторизация делегируется ShoppingListPolicy (view списка) в контроллере.
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
            'uuid' => ['nullable', 'uuid', 'unique:shopping_list_items,uuid'],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', Rule::enum(ShoppingCategory::class)],
            'is_checked' => ['nullable', 'boolean'],
            'status' => ['sometimes', Rule::enum(TaskStatus::class)],
            'position' => ['nullable', 'integer', 'min:0'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:9999'],
            'deadline' => ['nullable', 'date'],
            'reminder_at' => ['nullable', 'date'],
            'link' => ['nullable', 'string', 'max:2048'],
            'comment' => ['nullable', 'string', 'max:2000'],
            'tags' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
