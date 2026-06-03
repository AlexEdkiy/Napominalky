<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Создаёт монотонную PostgreSQL-последовательность server_revision.
     *
     * Курсор синхронизации (см. docs/architecture «Часть 0.2»): любая мутация
     * синхронизируемой записи получает следующее значение через nextval, что
     * обеспечивает монотонный delta-курсор без коллизий времени устройств.
     *
     * Ранняя метка времени гарантирует, что последовательность существует
     * до создания доменных таблиц (notes, reminders, shopping_lists и т. д.).
     */
    public function up(): void
    {
        DB::statement('CREATE SEQUENCE IF NOT EXISTS sync_revision_sequence START 1 INCREMENT 1');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP SEQUENCE IF EXISTS sync_revision_sequence');
    }
};
