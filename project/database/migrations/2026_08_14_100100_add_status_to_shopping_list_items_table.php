<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Статус строки задачи (только для пунктов списков type='tasks'):
     * - status — varchar(16), NOT NULL, default 'new' (enum TaskStatus).
     *
     * Инвариант: status='done' ⇔ is_checked=true. Backfill: отмеченные
     * пункты задач получают status='done'; пункты goods-списков не трогаем.
     */
    public function up(): void
    {
        Schema::table('shopping_list_items', function (Blueprint $table): void {
            $table->string('status', 16)->default('new')->after('is_checked');
        });

        DB::statement(<<<'SQL'
            UPDATE shopping_list_items
            SET status = 'done'
            WHERE is_checked = true
              AND shopping_list_id IN (SELECT id FROM shopping_lists WHERE type = 'tasks')
        SQL);
    }

    public function down(): void
    {
        Schema::table('shopping_list_items', function (Blueprint $table): void {
            $table->dropColumn('status');
        });
    }
};
