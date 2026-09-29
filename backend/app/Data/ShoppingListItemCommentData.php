<?php

declare(strict_types=1);

namespace App\Data;

readonly class ShoppingListItemCommentData
{
    /**
     * uuid — клиентский публичный идентификатор при offline-создании;
     * null означает «сгенерировать на сервере» (HasUuid на creating).
     */
    public function __construct(
        public string $body,
        public ?string $uuid = null,
    ) {}
}
