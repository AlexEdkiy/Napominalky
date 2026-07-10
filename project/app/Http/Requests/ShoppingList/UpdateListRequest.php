<?php

declare(strict_types=1);

namespace App\Http\Requests\ShoppingList;

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
            'title' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', Rule::in(['goods', 'tasks'])],
            'tags' => ['nullable', 'string', 'max:1000'],
            'is_completed' => ['sometimes', 'boolean'],
        ];
    }
}
