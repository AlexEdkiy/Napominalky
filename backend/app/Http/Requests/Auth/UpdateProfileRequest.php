<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
     * name + email: email уникален среди users, кроме текущего пользователя
     * (можно повторно отправить свой же адрес без ошибки).
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:1', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($this->user()->id),
            ],
        ];
    }
}
