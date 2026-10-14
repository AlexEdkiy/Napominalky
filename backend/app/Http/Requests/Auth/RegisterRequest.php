<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

final class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required' => 'Введите имя.',
            'name.string' => 'Введите имя текстом.',
            'name.max' => 'Имя не должно превышать 255 символов.',
            'email.required' => 'Введите email.',
            'email.string' => 'Введите корректный email.',
            'email.email' => 'Введите корректный email.',
            'email.max' => 'Email не должен превышать 255 символов.',
            'email.unique' => 'Этот email уже зарегистрирован. Войдите или восстановите пароль.',
            'password.required' => 'Введите пароль.',
            'password.string' => 'Введите пароль текстом.',
            'password.min' => 'Пароль должен содержать не менее 8 символов.',
            'password.confirmed' => 'Пароли не совпадают. Повторите пароль.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'confirmed', 'min:8'],
        ];
    }
}
