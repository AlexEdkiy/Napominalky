<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Категория элемента списка покупок (FR-12..FR-18).
 *
 * Backed string-enum: значение хранится в shopping_list_items.category
 * (varchar(20), default 'other'). label() даёт русскую подпись для API
 * Resource / UI; зеркалируется на mobile constants/ShoppingCategory.
 */
enum ShoppingCategory: string
{
    case Products = 'products';
    case Household = 'household';
    case Pharmacy = 'pharmacy';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Products => 'Продукты',
            self::Household => 'Бытовое',
            self::Pharmacy => 'Аптека',
            self::Other => 'Другое',
        };
    }
}
