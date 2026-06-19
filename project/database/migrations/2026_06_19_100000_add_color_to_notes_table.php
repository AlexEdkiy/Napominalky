<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Добавляет поле color (метка цвета) в таблицу notes.
     *
     * Допустимые значения: teal, coral, amber, purple, null (без цвета).
     * Ограничение CHECK на уровне БД гарантирует целостность данных.
     */
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->string('color', 16)->nullable()->after('is_archived');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->dropColumn('color');
        });
    }
};
