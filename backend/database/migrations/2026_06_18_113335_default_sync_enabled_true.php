<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Синхронизация — основная функция приложения, поэтому включаем её по умолчанию
 * для новых пользователей. Существующие аккаунты также переводим в sync_enabled=true.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE users ALTER COLUMN sync_enabled SET DEFAULT true');
        DB::table('users')->update(['sync_enabled' => true]);
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE users ALTER COLUMN sync_enabled SET DEFAULT false');
    }
};
