<?php

declare(strict_types=1);

namespace App\Http\Requests\ShoppingListItem;

use App\Enums\ShoppingCategory;
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
            'position' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
