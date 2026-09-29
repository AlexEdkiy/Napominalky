<?php

declare(strict_types=1);

namespace App\Data;

readonly class ResetPasswordData
{
    public function __construct(
        public string $email,
        public string $token,
        public string $password,
    ) {}
}
