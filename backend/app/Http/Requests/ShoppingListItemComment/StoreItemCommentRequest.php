<?php

declare(strict_types=1);

namespace App\Http\Requests\ShoppingListItemComment;

use Illuminate\Foundation\Http\FormRequest;

final class StoreItemCommentRequest extends FormRequest
{
    /**
     * Авторизация делегируется ShoppingListPolicy (view списка) в контроллере.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * uuid — клиентский публичный идентификатор при offline-создании
     * (sync-идемпотентность); unique защищает от коллизий на уровне 422.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:2000'],
            'uuid' => ['sometimes', 'uuid', 'unique:shopping_list_item_comments,uuid'],
        ];
    }
}
