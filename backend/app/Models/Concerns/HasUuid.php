<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Назначает публичный идентификатор uuid при создании записи.
 *
 * Внутренний ключ id остаётся приватным (используется во FK и индексах),
 * uuid выступает стабильным внешним идентификатором: его отдают клиентам,
 * по нему работает route model binding и sync-контракт (см. docs/architecture
 * «Часть 0.7»). Значение генерируется один раз на creating, если не задано
 * заранее (например, клиентом при offline-создании записи).
 */
trait HasUuid
{
    public static function bootHasUuid(): void
    {
        static::creating(static function (Model $model): void {
            $model->uuid ??= (string) Str::uuid();
        });
    }
}
