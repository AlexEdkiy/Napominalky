<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Добавляет расширенную мета-информацию к пунктам списков покупок:
     * - reminder_at — дата+время напоминания (NULL = не задано)
     * - link        — ссылка на товар/ресурс (VARCHAR 2048, NULL = не задана)
     * - comment     — произвольный комментарий (TEXT, NULL = не задан)
     * - tags        — JSON-массив тегов как непрозрачная строка (NULL = нет тегов)
     */
    public function up(): void
    {
        Schema::table('shopping_list_items', function (Blueprint $table) {
            $table->timestamp('reminder_at')->nullable()->after('deadline');
            $table->string('link', 2048)->nullable()->after('reminder_at');
            $table->text('comment')->nullable()->after('link');
            $table->text('tags')->nullable()->after('comment');
        });
    }

    public function down(): void
    {
        Schema::table('shopping_list_items', function (Blueprint $table) {
            $table->dropColumn(['reminder_at', 'link', 'comment', 'tags']);
        });
    }
};
