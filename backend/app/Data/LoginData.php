<?php

declare(strict_types=1);

namespace App\Data;

readonly class LoginData
{
    public function __construct(
        public string $email,
        public string $password,
        public ?string $deviceName = null,
    ) {}
}
