<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates PATCH /admin/users/{user}/status
 *
 * Guards:
 * - Cannot deactivate yourself
 * - Cannot deactivate the last active super-admin
 */
final class SetUserStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var User $actor */
        $actor = $this->user();
        /** @var User $target */
        $target = $this->route('user');

        if ($this->boolean('is_active') === false && $actor->id === $target->id) {
            $this->failedAuthorizationMessage = 'Нельзя деактивировать собственный аккаунт.';

            return false;
        }

        if ($this->boolean('is_active') === false && $target->is_super_admin) {
            $hasOtherActiveSuperAdmin = User::active()
                ->where('is_super_admin', true)
                ->where('id', '!=', $target->id)
                ->exists();

            if (! $hasOtherActiveSuperAdmin) {
                $this->failedAuthorizationMessage =
                    'Нельзя деактивировать единственного активного суперадмина.';

                return false;
            }
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'is_active' => ['required', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'is_active.required' => 'Поле is_active обязательно.',
            'is_active.boolean' => 'Поле is_active должно быть булевым значением.',
        ];
    }

    protected string $failedAuthorizationMessage = 'Доступ запрещён.';

    protected function failedAuthorization(): never
    {
        abort(403, $this->failedAuthorizationMessage);
    }
}
