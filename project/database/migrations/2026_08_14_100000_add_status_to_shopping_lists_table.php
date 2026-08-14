<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Статус задачи (только для type='tasks'; goods остаются в дефолте):
     * - status — varchar(16), NOT NULL, default 'new' (enum TaskStatus);
     * - status_is_manual — закрепление ручного статуса: пока true,
     *   автодеривация статуса задачи из статусов пунктов отключена.
     *
     * Backfill: уже выполненные задачи (is_completed=true) получают
     * status='done' с закреплением — их состояние выставлено вручную.
     */
    public function up(): void
    {
        Schema::table('shopping_lists', function (Blueprint $table): void {
            $table->string('status', 16)->default('new')->after('is_completed');
            $table->boolean('status_is_manual')->default(false)->after('status');
        });

        DB::table('shopping_lists')
            ->where('type', 'tasks')
            ->where('is_completed', true)
            ->update(['status' => 'done', 'status_is_manual' => true]);
    }

    public function down(): void
    {
        Schema::table('shopping_lists', function (Blueprint $table): void {
            $table->dropColumn(['status', 'status_is_manual']);
        });
    }
};
