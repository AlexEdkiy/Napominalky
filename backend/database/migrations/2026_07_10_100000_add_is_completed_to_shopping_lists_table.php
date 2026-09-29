<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Добавляет флаг «список выполнен» уровня списка покупок:
     * - is_completed — boolean, NOT NULL, default false
     *
     * Флаг независим от отметок пунктов (is_checked): клиент показывает
     * чекбокс/фильтр «Выполненные» и зачёркивание всего списка.
     */
    public function up(): void
    {
        Schema::table('shopping_lists', function (Blueprint $table): void {
            $table->boolean('is_completed')->default(false)->after('tags');
        });
    }

    public function down(): void
    {
        Schema::table('shopping_lists', function (Blueprint $table): void {
            $table->dropColumn('is_completed');
        });
    }
};
