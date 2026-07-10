<?php

declare(strict_types=1);

namespace App\Data;

readonly class ShoppingListData
{
    public function __construct(
        public string $title,
        public string $type = 'goods',
        public ?string $tags = null,
        public bool $isCompleted = false,
    ) {}
}
