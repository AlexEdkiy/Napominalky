<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Статус задачи и её строки — только для списков type='tasks'.
 *
 * Backed string-enum: значение хранится в shopping_lists.status и
 * shopping_list_items.status (varchar(16), default 'new'). Списки goods
 * статусов не имеют (колонка остаётся в дефолте 'new' и не читается).
 * label() даёт русскую подпись для API Resource / UI.
 */
enum TaskStatus: string
{
    case New = 'new';
    case InProgress = 'in_progress';
    case Postponed = 'postponed';
    case Done = 'done';

    public function label(): string
    {
        return match ($this) {
            self::New => 'Новая',
            self::InProgress => 'В работе',
            self::Postponed => 'Отложена',
            self::Done => 'Выполнена',
        };
    }

    public function isDone(): bool
    {
        return $this === self::Done;
    }

    /**
     * Статус после переключения булева флага (is_checked / is_completed) без
     * явного статуса: отметка → Done; снятие отметки с Done → New; снятие
     * отметки с не-Done статуса его не меняет (В работе/Отложена сохраняются).
     */
    public static function forChecked(bool $checked, self $current): self
    {
        if ($checked) {
            return self::Done;
        }

        return $current === self::Done ? self::New : $current;
    }
}
