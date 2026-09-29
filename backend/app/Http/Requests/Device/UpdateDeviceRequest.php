<?php

declare(strict_types=1);

namespace App\Http\Requests\Device;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Валидация обновления устройства /devices/{uuid}.
 *
 * Оба поля частичные: незаданное поле сохраняет текущее значение записи.
 * Проверка владения (device.user_id === user.id) выполняется в контроллере.
 */
final class UpdateDeviceRequest extends FormRequest
{
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
            'name' => ['nullable', 'string', 'max:255'],
            'last_synced_revision' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
