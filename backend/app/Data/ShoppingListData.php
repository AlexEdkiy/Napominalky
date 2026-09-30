<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\TaskStatus;

readonly class ShoppingListData
{
    /**
     * status / statusIsManual — только для type='tasks'; null означает
     * «поле не пришло в запросе» (goods-списки статусов не имеют).
     *
     * @param  array{deadline?: ?string, reminder_at?: ?string}  $schedule
     */
    public function __construct(
        public string $title,
        public string $type = 'goods',
        public ?string $tags = null,
        public bool $isCompleted = false,
        public ?TaskStatus $status = null,
        public ?bool $statusIsManual = null,
        public array $schedule = [],
    ) {}
}
