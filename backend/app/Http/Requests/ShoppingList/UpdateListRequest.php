<?php

declare(strict_types=1);

namespace App\Http\Requests\ShoppingList;

use App\Enums\TaskStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateListRequest extends FormRequest
{
    /**
     * Авторизация обновления делегируется ShoppingListPolicy в контроллере.
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
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['nullable', 'string', Rule::in(['goods', 'tasks'])],
            'tags' => ['nullable', 'string', 'max:1000'],
            'deadline' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'reminder_at' => ['sometimes', 'nullable', 'date'],
            'is_completed' => ['sometimes', 'boolean'],
            'status' => ['sometimes', Rule::enum(TaskStatus::class)],
            'status_is_manual' => ['sometimes', 'boolean'],
        ];
    }
}
