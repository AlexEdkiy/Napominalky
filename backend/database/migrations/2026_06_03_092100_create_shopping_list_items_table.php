<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('shopping_list_items', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('shopping_list_id')
                ->constrained()
                ->cascadeOnDelete();
            // Денормализация user_id для sync-фильтра по владельцу
            // (выборка изменений идёт по user_id + server_revision).
            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->string('name', 255);
            $table->string('category', 20)->default('other');
            $table->boolean('is_checked')->default(false);
            $table->integer('position')->default(0);
            $table->bigInteger('server_revision');
            $table->timestamps();
            $table->softDeletes();

            $table->index('user_id');
            $table->index(['user_id', 'server_revision']);
            $table->index('shopping_list_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shopping_list_items');
    }
};
