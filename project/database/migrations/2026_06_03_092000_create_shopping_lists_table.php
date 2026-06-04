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
        Schema::create('shopping_lists', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->string('title', 255);
            $table->bigInteger('server_revision');
            $table->timestamps();
            $table->softDeletes();

            $table->index('user_id');
            $table->index(['user_id', 'server_revision']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shopping_lists');
    }
};
