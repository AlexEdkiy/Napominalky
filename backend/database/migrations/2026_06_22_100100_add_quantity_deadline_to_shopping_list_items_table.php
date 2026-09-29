<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Добавляет поля quantity и deadline к таблице shopping_list_items.
     * quantity — количество единиц товара/задачи (по умолчанию 1).
     * deadline — дата дедлайна для задачи (NULL = не задан).
     */
    public function up(): void
    {
        Schema::table('shopping_list_items', function (Blueprint $table) {
            $table->integer('quantity')->notNull()->default(1)->after('position');
            $table->date('deadline')->nullable()->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('shopping_list_items', function (Blueprint $table) {
            $table->dropColumn(['quantity', 'deadline']);
        });
    }
};
