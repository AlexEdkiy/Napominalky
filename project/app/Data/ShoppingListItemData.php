<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\ShoppingCategory;

readonly class ShoppingListItemData
{
    public function __construct(
        public string $name,
        public ShoppingCategory $category = ShoppingCategory::Other,
        public bool $isChecked = false,
        public int $position = 0,
        public int $quantity = 1,
        public ?string $deadline = null,
    ) {}
}
