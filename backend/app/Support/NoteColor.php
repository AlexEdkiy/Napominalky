<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Единая палитра цветовых маркеров заметки (MBE-23).
 *
 * Веб-ЛК исторически слал именованные токены (teal/coral/amber/purple),
 * мобильное приложение — hex из своей палитры; REST-валидация принимала
 * только имена, а sync — что угодно, поэтому маркеры мобильных заметок
 * веб не понимал, а веб-цвета терялись на мобилке. Контракт: оба набора
 * допустимы и отдаются как есть, клиенты обязаны рендерить все 8 значений.
 */
final class NoteColor
{
    /** Именованные токены веб-ЛК. */
    public const array NAMED = ['teal', 'coral', 'amber', 'purple'];

    /** Hex-токены мобильного приложения (`mobile/src/db/repositories/notesRepo.ts`). */
    public const array HEX = ['#ea899a', '#ffebb8', '#91d177', '#afdafc'];

    /** Все допустимые значения `notes.color`. */
    public const array TOKENS = [...self::NAMED, ...self::HEX];
}
