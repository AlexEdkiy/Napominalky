<?php

declare(strict_types=1);

namespace App\Data;

readonly class NoteData
{
    public function __construct(
        public string $title,
        public ?string $body = null,
        public bool $isPinned = false,
        public bool $isArchived = false,
    ) {}
}
