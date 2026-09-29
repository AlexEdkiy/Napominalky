<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\ShoppingCategory;
use App\Enums\TaskStatus;

readonly class ShoppingListItemData
{
    /**
     * status — только для пунктов списков type='tasks'; null означает
     * «поле не пришло» (тогда статус выводится из isChecked).
     */
    public function __construct(
        public string $name,
        public ShoppingCategory $category = ShoppingCategory::Other,
        public bool $isChecked = false,
        public ?TaskStatus $status = null,
        public int $position = 0,
        public int $quantity = 1,
        public ?string $deadline = null,
        public ?string $reminderAt = null,
        public ?string $link = null,
        public ?string $comment = null,
        public ?string $tags = null,
    ) {}
}
