<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates DELETE /admin/users/{user}
 *
 * Guards:
 * - Cannot delete yourself
 * - Cannot delete the last active super-admin
 */
final class DeleteUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var User $actor */
        $actor = $this->user();
        /** @var User $target */
        $target = $this->route('user');

        if ($actor->id === $target->id) {
            abort(403, 'Нельзя удалить собственный аккаунт через этот эндпоинт.');
        }

        if ($target->is_super_admin) {
            $hasOtherActiveSuperAdmin = User::active()
                ->where('is_super_admin', true)
                ->where('id', '!=', $target->id)
                ->exists();

            if (! $hasOtherActiveSuperAdmin) {
                abort(403, 'Нельзя удалить единственного активного суперадмина.');
            }
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }
}
