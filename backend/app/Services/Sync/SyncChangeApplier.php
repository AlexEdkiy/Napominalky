<?php

declare(strict_types=1);

namespace App\Services\Sync;

use App\Actions\ShoppingList\RecalculateListStatusAction;
use App\Data\SyncChangeData;
use App\Enums\TaskStatus;
use App\Models\ShoppingList;
use App\Models\ShoppingListItem;
use App\Models\ShoppingListItemComment;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Применяет одно клиентское изменение к серверной записи (upsert/tombstone).
 *
 * Инкапсулирует whitelist-присвоение полей, разрешение родителя для
 * shopping_list_item и shopping_list_item_comment (через SyncParentResolver)
 * и критичную для LWW запись хранимого updated_at = клиентский
 * updated_at (с отключением авто-timestamps). server_revision при save проставит
 * трейт TracksSyncRevision. См. docs/architecture «Часть 0.2».
 */
final class SyncChangeApplier
{
    public function __construct(
        private readonly RecalculateListStatusAction $recalculateStatus,
        private readonly SyncParentResolver $parentResolver,
    ) {}

    /**
     * NOT NULL строковые доменные колонки: при null в клиентском payload
     * коерсятся в '' (заметка/список без заголовка, комментарий без тела),
     * иначе нарушился бы constraint и весь push батча падал бы 500.
     *
     * @var list<string>
     */
    private const array NON_NULLABLE_STRINGS = ['title', 'name', 'author_name', 'body'];

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
        $model = new $class;

        $model->uuid = $change->uuid;
        $model->user_id = $user->id;
        $this->fillFields($user, $model, $change);

        // Комментарий-сирота: родительский пункт не резолвится (чужой/удалён
        // hard) — shopping_list_item_id остался NULL, а FK NOT NULL. Пропускаем
        // change (no-op), иначе INSERT валит всю push-транзакцию 500. В норме
        // FIFO-outbox гарантирует, что родитель уже на сервере.
        if ($model instanceof ShoppingListItemComment && $model->shopping_list_item_id === null) {
            return null;
        }

        // Пункт-сирота (REVIEW-1 / DEV-23): shopping_list_uuid отсутствует, чужой
        // или неизвестный — shopping_list_id остался NULL при NOT NULL FK.
        // Тот же no-op, иначе одна запись валит батч 500 и клиент бесконечно
        // ретраит весь outbox (push и pull устройства блокируются навсегда).
        if ($model instanceof ShoppingListItem && $model->shopping_list_id === null) {
            return null;
        }

        // created_at не входит в whitelist payload, а persist() отключает
        // авто-timestamps (ради LWW updated_at), поэтому для НОВОЙ записи
        // created_at остался бы NULL. Проставляем фолбэком клиентский updated_at.
        $model->created_at ??= $change->updatedAt;

        if ($change->operation === 'delete') {
            $model->deleted_at = $change->updatedAt;
        }

        $this->persist($model, $change);
        $this->recalculateParent($model);

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
            $this->recalculateParent($existing);

            return;
        }

        // Реанимация tombstone при update/create поверх удалённой записи.
        $existing->deleted_at = null;
        $this->fillFields($user, $existing, $change);
        $this->persist($existing, $change);
        $this->recalculateParent($existing);
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
            $this->parentResolver->resolveItemParent($user, $model, $change->payload);
            $this->normalizeItemStatus($model, $change);
        }

        // Комментарии треда на статус задачи не влияют — пересчёт не нужен
        // (recalculateParent реагирует только на ShoppingListItem).
        if ($model instanceof ShoppingListItemComment) {
            $this->parentResolver->resolveCommentParent($user, $model, $change->payload);
        }

        if ($model instanceof ShoppingList) {
            $this->normalizeListStatus($model, $change);
        }
    }

    /**
     * Инвариант задач для списка: status='done' ⇔ is_completed=true.
     * При обоих полях в payload приоритет у status (is_completed выводится
     * из него); при одном is_completed статус выводится через forChecked.
     * Для goods статусные поля не применяются (дефолт 'new'/false).
     */
    private function normalizeListStatus(ShoppingList $list, SyncChangeData $change): void
    {
        if (! $list->isTasks()) {
            $list->status = TaskStatus::New;
            $list->status_is_manual = false;

            return;
        }

        if (array_key_exists('status', $change->payload)) {
            $list->is_completed = ($list->status ?? TaskStatus::New)->isDone();

            return;
        }

        if (array_key_exists('is_completed', $change->payload)) {
            $list->status = TaskStatus::forChecked(
                (bool) $list->is_completed,
                $list->status ?? TaskStatus::New,
            );
        }
    }

    /**
     * Инвариант задач для пункта: status='done' ⇔ is_checked=true
     * (приоритет у status, как и для списка). Пункты goods-списков
     * статуса не имеют — колонка принудительно в дефолте 'new'.
     */
    private function normalizeItemStatus(ShoppingListItem $item, SyncChangeData $change): void
    {
        if (! $this->parentIsTasks($item)) {
            $item->status = TaskStatus::New;

            return;
        }

        if (array_key_exists('status', $change->payload)) {
            $item->is_checked = ($item->status ?? TaskStatus::New)->isDone();

            return;
        }

        if (array_key_exists('is_checked', $change->payload)) {
            $item->status = TaskStatus::forChecked(
                (bool) $item->is_checked,
                $item->status ?? TaskStatus::New,
            );
        }
    }

    /**
     * Является ли родительский список пункта задачей (type='tasks').
     * Родитель ищется включая tombstones: LWW может реанимировать его позже.
     */
    private function parentIsTasks(ShoppingListItem $item): bool
    {
        if ($item->shopping_list_id === null) {
            return false;
        }

        return ShoppingList::withTrashed()
            ->whereKey($item->shopping_list_id)
            ->value('type') === 'tasks';
    }

    /**
     * Пересчёт статуса родительской задачи после применения изменения пункта.
     * Обычный save (timestamps now, свой server_revision) — отдельно от
     * LWW-persist пункта: серверная деривация новее клиентской версии списка.
     * Guard'ы (goods / закреплённый ручной статус) — внутри Recalculate.
     */
    private function recalculateParent(Model $model): void
    {
        if (! $model instanceof ShoppingListItem || $model->shopping_list_id === null) {
            return;
        }

        $list = ShoppingList::query()->whereKey($model->shopping_list_id)->first();

        if ($list !== null) {
            ($this->recalculateStatus)($list);
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
