<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Тред комментариев к строке задачи (shopping_list_item).
     *
     * Заменяет одиночное поле shopping_list_items.comment (двухфазный вывод:
     * legacy-колонка остаётся, данные переносятся бэкфилл-миграцией
     * 2026_08_14_110100). author_name хранится денормализованно — снимок
     * имени автора на момент написания. user_id — денормализованный владелец
     * (равен user_id строки), по нему работает sync-фильтр pull.
     */
    public function up(): void
    {
        Schema::create('shopping_list_item_comments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('shopping_list_item_id')
                ->constrained()
                ->cascadeOnDelete();
            // Денормализация user_id для sync-фильтра по владельцу
            // (выборка изменений идёт по user_id + server_revision).
            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->string('author_name', 255);
            $table->text('body');
            $table->bigInteger('server_revision');
            $table->timestamps();
            $table->softDeletes();

            $table->index('shopping_list_item_id');
            $table->index('user_id');
            $table->index(['user_id', 'server_revision']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shopping_list_item_comments');
    }
};
