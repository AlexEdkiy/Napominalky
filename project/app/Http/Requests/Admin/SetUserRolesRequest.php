<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates PATCH /admin/users/{user}/roles
 *
 * Guards:
 * - Cannot remove is_super_admin from yourself
 * - Cannot remove is_super_admin from the last active super-admin
 * - If is_super_admin=true but is_admin=false, is_admin is forced to true
 *   (super-admin implies admin; rejecting would be confusing UX for the caller)
 */
final class SetUserRolesRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var User $actor */
        $actor = $this->user();
        /** @var User $target */
        $target = $this->route('user');

        $removingSuperAdmin = $target->is_super_admin && ! $this->boolean('is_super_admin');

        if ($removingSuperAdmin && $actor->id === $target->id) {
            abort(403, 'Нельзя снять роль суперадмина с собственного аккаунта.');
        }

        if ($removingSuperAdmin) {
            $hasOtherActiveSuperAdmin = User::active()
                ->where('is_super_admin', true)
                ->where('id', '!=', $target->id)
                ->exists();

            if (! $hasOtherActiveSuperAdmin) {
                abort(403, 'Нельзя снять роль суперадмина у единственного активного суперадмина.');
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
            'is_admin' => ['required', 'boolean'],
            'is_super_admin' => ['required', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'is_admin.required' => 'Поле is_admin обязательно.',
            'is_admin.boolean' => 'Поле is_admin должно быть булевым значением.',
            'is_super_admin.required' => 'Поле is_super_admin обязательно.',
            'is_super_admin.boolean' => 'Поле is_super_admin должно быть булевым значением.',
        ];
    }

    /**
     * Enforce: super-admin implies admin.
     * If is_super_admin=true arrives with is_admin=false, force is_admin=true.
     *
     * @return array<string, mixed>
     */
    public function validated($key = null, $default = null): mixed
    {
        /** @var array<string, mixed> $data */
        $data = parent::validated($key, $default);

        if (is_array($data) && ($data['is_super_admin'] ?? false) === true) {
            $data['is_admin'] = true;
        }

        return $key === null ? $data : ($data[$key] ?? $default);
    }
}
