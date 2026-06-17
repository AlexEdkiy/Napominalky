<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates PATCH /admin/users/{user}/password
 *
 * Guards:
 * - Cannot change your own password through this admin endpoint (use /auth/me instead)
 */
final class ChangeUserPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var User $actor */
        $actor = $this->user();
        /** @var User $target */
        $target = $this->route('user');

        if ($actor->id === $target->id) {
            abort(403, 'Нельзя менять собственный пароль через этот эндпоинт. Используйте /auth/me.');
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'password.required' => 'Поле password обязательно.',
            'password.string' => 'Пароль должен быть строкой.',
            'password.min' => 'Пароль должен содержать не менее 8 символов.',
            'password.confirmed' => 'Подтверждение пароля не совпадает.',
        ];
    }
}
