<?php

declare(strict_types=1);

namespace App\Http\Requests\ShoppingListItem;

use App\Enums\ShoppingCategory;
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
            'position' => ['nullable', 'integer', 'min:0'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:9999'],
            'deadline' => ['nullable', 'date'],
        ];
    }
}
