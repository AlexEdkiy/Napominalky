<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('reminders', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->string('title', 255);
            $table->text('notes')->nullable();
            $table->timestampTz('remind_at');
            $table->string('recurrence', 20)->default('none');
            $table->boolean('is_completed')->default(false);
            $table->timestampTz('completed_at')->nullable();
            $table->timestampTz('snoozed_until')->nullable();
            // Источник-«родитель» при создании напоминания из другой сущности
            // (например, из списка покупок). uuid + тип сущности, без жёсткого FK.
            $table->uuid('source_uuid')->nullable();
            $table->string('source_type', 20)->nullable();
            $table->bigInteger('server_revision');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'server_revision']);
            $table->index(['user_id', 'remind_at']);
        });

        $this->addPendingPartialIndex();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reminders');
    }

    /**
     * Частичный индекс для быстрой выборки активных (невыполненных)
     * напоминаний по дате срабатывания — основной запрос списка и
     * планирования уведомлений (FR-19, FR-26).
     */
    private function addPendingPartialIndex(): void
    {
        DB::statement(
            'CREATE INDEX reminders_user_id_remind_at_pending_index
             ON reminders (user_id, remind_at)
             WHERE NOT is_completed AND deleted_at IS NULL'
        );
    }
};
