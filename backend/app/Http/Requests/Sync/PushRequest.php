<?php

declare(strict_types=1);

namespace App\Http\Requests\Sync;

use App\Data\SyncChangeData;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Валидация delta-push запроса /sync/push.
 *
 * device_uuid/device_name — устройство-источник батча (регистрируется с курсором
 * после применения). changes — outbox-батч клиента: для каждого изменения
 * фиксируем тип сущности, uuid, операцию, payload и client-side updated_at,
 * по которому SyncPushService разрешает конфликты (Last-Write-Wins, FR-37).
 */
final class PushRequest extends FormRequest
{
    /**
     * Авторизация — только аутентификация (auth:sanctum). Данные скоупятся
     * по текущему пользователю внутри SyncPushService.
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
            'device_uuid' => ['required', 'uuid'],
            'device_name' => ['nullable', 'string', 'max:255'],
            'changes' => ['present', 'array', 'max:500'],
            'changes.*.entity_type' => [
                'required',
                'string',
                'in:note,shopping_list,shopping_list_item,shopping_list_item_comment,reminder',
            ],
            'changes.*.uuid' => ['required', 'uuid'],
            'changes.*.operation' => ['required', 'in:create,update,delete'],
            'changes.*.payload' => ['nullable', 'array'],
            'changes.*.updated_at' => ['required', 'date'],
        ];
    }

    /** Validate an optional new field without narrowing the legacy full payload array.
     * Nested wildcard rules would silently strip existing fields from validated().
     *
     * @return array<callable>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $changes = $this->input('changes', []);
            if (! is_array($changes)) {
                return;
            }
            foreach ($changes as $index => $change) {
                $payload = is_array($change) ? ($change['payload'] ?? null) : null;
                if (is_array($payload) && array_key_exists('is_favorite', $payload)
                    && ! in_array($payload['is_favorite'], [true, false, 0, 1, '0', '1'], true)) {
                    $validator->errors()->add("changes.{$index}.payload.is_favorite", 'Некорректная отметка избранного.');
                }
            }
        }];
    }

    /**
     * Маппит валидированный батч в list<SyncChangeData> для SyncPushService.
     *
     * @return list<SyncChangeData>
     */
    public function changeDtos(): array
    {
        return array_map(
            static fn (array $change): SyncChangeData => SyncChangeData::fromArray($change),
            $this->validated('changes'),
        );
    }
}
