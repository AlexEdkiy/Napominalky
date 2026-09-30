<?php

declare(strict_types=1);

namespace App\Services\ShoppingList;

use App\Models\ShoppingList;
use Carbon\CarbonImmutable;

/**
 * Общая настройка сохраняется отдельно: после завершения раннего пункта
 * итог можно пересчитать, не потеряв выбранную пользователем дату.
 */
final class ListScheduleResolver
{
    /** @param array{deadline?: ?string, reminder_at?: ?string} $patch */
    public function fill(ShoppingList $list, array $patch = []): void
    {
        if (! $list->isTasks()) {
            return;
        }

        foreach (['deadline', 'reminder_at'] as $field) {
            if (array_key_exists($field, $patch)) {
                $value = $patch[$field];
                if ($field === 'reminder_at' && $value !== null) {
                    $value = CarbonImmutable::parse($value)->utc();
                }
                $list->setAttribute('manual_'.$field, $value);
            }

            $manual = $list->getAttribute('manual_'.$field);
            $itemValue = $list->exists
                ? $list->items()->where('is_checked', false)->min($field)
                : null;
            $candidate = $list->newInstance([$field => $itemValue])->getAttribute($field);

            $list->setAttribute($field, $candidate !== null && ($manual === null || $candidate->lt($manual))
                ? $candidate
                : $manual);
        }
    }
}
