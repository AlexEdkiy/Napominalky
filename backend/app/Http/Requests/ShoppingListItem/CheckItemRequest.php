<?php

declare(strict_types=1);

namespace App\Http\Requests\ShoppingListItem;

use Illuminate\Foundation\Http\FormRequest;

final class CheckItemRequest extends FormRequest
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
            'is_checked' => ['required', 'boolean'],
        ];
    }
}
