<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateProfileRequest extends FormRequest
{
    /**
     * Пользователь редактирует только собственный профиль
     * (auth:sanctum на маршруте).
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Только name: смена email требует ре-верификации и не поддерживается.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:1', 'max:255'],
        ];
    }
}
