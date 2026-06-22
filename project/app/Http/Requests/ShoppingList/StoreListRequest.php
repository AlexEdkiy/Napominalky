<?php

declare(strict_types=1);

namespace App\Http\Requests\ShoppingList;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreListRequest extends FormRequest
{
    /**
     * Авторизация создания делегируется ShoppingListPolicy в контроллере.
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
            'uuid' => ['nullable', 'uuid', 'unique:shopping_lists,uuid'],
            'title' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', Rule::in(['goods', 'tasks'])],
        ];
    }
}
