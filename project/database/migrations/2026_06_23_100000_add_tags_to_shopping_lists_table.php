<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Добавляет поле тегов уровня списка покупок:
     * - tags — JSON-массив тегов как непрозрачная строка (TEXT, NULL = нет тегов)
     *
     * Семантика аналогична shopping_list_items.tags: сервер хранит и отдаёт
     * строку без интерпретации; клиент управляет JSON-структурой внутри.
     */
    public function up(): void
    {
        Schema::table('shopping_lists', function (Blueprint $table): void {
            $table->text('tags')->nullable()->after('type');
        });
    }

    public function down(): void
    {
        Schema::table('shopping_lists', function (Blueprint $table): void {
            $table->dropColumn('tags');
        });
    }
};
