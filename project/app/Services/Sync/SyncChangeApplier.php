<?php

declare(strict_types=1);

namespace App\Services\Sync;

use App\Data\SyncChangeData;
use App\Models\ShoppingListItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Применяет одно клиентское изменение к серверной записи (upsert/tombstone).
 *
 * Инкапсулирует whitelist-присвоение полей, разрешение родителя для
 * shopping_list_item и критичную для LWW запись хранимого updated_at = клиентский
 * updated_at (с отключением авто-timestamps). server_revision при save проставит
 * трейт TracksSyncRevision. См. docs/architecture «Часть 0.2».
 */
final class SyncChangeApplier
{
    /**
     * NOT NULL строковые доменные колонки: при null в клиентском payload
     * коерсятся в '' (заметка/список без заголовка), иначе нарушился бы
     * constraint и весь push батча падал бы 500.
     *
     * @var list<string>
     */
    private const array NON_NULLABLE_STRINGS = ['title', 'name'];

    /**
     * Создаёт новую запись из изменения (operation create/update/delete).
     * Для delete сразу ставит tombstone (deleted_at = updated_at).
     *
     * Delete неизвестного сервером uuid с пустым payload — no-op: записи,
     * которую нужно «надгробить», на сервере никогда не было, а вставить
     * tombstone с NULL в NOT NULL доменных колонках нельзя. Возвращается null
     * (изменение считается применённым, но строка не создаётся).
     *
     * @return Model|null созданная модель, либо null для no-op delete
     */
    public function create(User $user, SyncChangeData $change): ?Model
    {
        if ($change->operation === 'delete' && $change->payload === []) {
            return null;
        }

        $class = SyncEntities::modelFor($change->entityType);
        /** @var Model $model */
        $model = new $class();

        $model->uuid = $change->uuid;
        $model->user_id = $user->id;
        $this->fillFields($user, $model, $change);

        if ($change->operation === 'delete') {
            $model->deleted_at = $change->updatedAt;
        }

        $this->persist($model, $change);

        return $model;
    }

    /**
     * Применяет изменение к существующей записи (client wins по LWW).
     * Для delete — soft delete (tombstone), иначе upsert whitelisted-полей.
     */
    public function apply(User $user, Model $existing, SyncChangeData $change): void
    {
        if ($change->operation === 'delete') {
            $existing->deleted_at = $change->updatedAt;
            $this->persist($existing, $change);

            return;
        }

        // Реанимация tombstone при update/create поверх удалённой записи.
        $existing->deleted_at = null;
        $this->fillFields($user, $existing, $change);
        $this->persist($existing, $change);
    }

    /**
     * Присваивает whitelisted-поля из payload. forceFill — поля вне $fillable
     * (is_completed, position и т.п.) выставляются доменными правилами sync.
     * Касты модели применяются при присвоении: enum (recurrence/category) из
     * value-строки, bool из 0/1/true, datetime из ISO-строки.
     */
    private function fillFields(User $user, Model $model, SyncChangeData $change): void
    {
        $allowed = SyncEntities::fieldsFor($change->entityType);

        foreach ($allowed as $field) {
            if (array_key_exists($field, $change->payload)) {
                $value = $change->payload[$field];

                // NOT NULL строковые колонки (title/name) не принимают null из
                // клиента: заметка/список без заголовка приходит с null, что
                // нарушало бы constraint и блокировало весь push. Коерсим в ''.
                if ($value === null && in_array($field, self::NON_NULLABLE_STRINGS, true)) {
                    $value = '';
                }

                $model->forceFill([$field => $value]);
            }
        }

        if ($model instanceof ShoppingListItem) {
            $this->resolveParent($user, $model, $change);
        }
    }

    /**
     * Резолвит публичный shopping_list_uuid из payload во внутренний
     * shopping_list_id (в рамках записей того же пользователя, включая
     * мягко удалённые родители). Чужой/неизвестный uuid игнорируется.
     */
    private function resolveParent(User $user, ShoppingListItem $item, SyncChangeData $change): void
    {
        $parentUuid = $change->payload['shopping_list_uuid'] ?? null;

        if (! is_string($parentUuid) || $parentUuid === '') {
            return;
        }

        $parentId = $user->shoppingLists()
            ->withTrashed()
            ->where('uuid', $parentUuid)
            ->value('id');

        if ($parentId !== null) {
            $item->shopping_list_id = $parentId;
        }
    }

    /**
     * Сохраняет модель с хранимым updated_at = клиентский updated_at — это
     * ключ LWW для следующих сравнений. Авто-timestamps отключаются на время
     * save, иначе Eloquent перезапишет updated_at на now(). server_revision
     * проставит трейт TracksSyncRevision на saving.
     */
    private function persist(Model $model, SyncChangeData $change): void
    {
        $model->updated_at = $change->updatedAt;

        $original = $model->timestamps;
        $model->timestamps = false;

        try {
            $model->save();
        } finally {
            $model->timestamps = $original;
        }
    }
}
