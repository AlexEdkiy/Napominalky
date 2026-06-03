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
        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->string('title', 255);
            $table->text('body')->nullable();
            $table->boolean('is_pinned')->default(false);
            $table->boolean('is_archived')->default(false);
            $table->bigInteger('server_revision');
            $table->timestamps();
            $table->softDeletes();

            $table->index('user_id');
            $table->index(['user_id', 'server_revision']);
        });

        $this->addFullTextSearch();
        $this->addPinnedPartialIndex();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notes');
    }

    /**
     * Полнотекстовый поиск (FR-11): хранимый tsvector + GIN-индекс.
     */
    private function addFullTextSearch(): void
    {
        DB::statement(
            "ALTER TABLE notes
             ADD COLUMN ts_search TSVECTOR
             GENERATED ALWAYS AS (
                 to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, ''))
             ) STORED"
        );

        DB::statement('CREATE INDEX notes_ts_search_gin ON notes USING GIN (ts_search)');
    }

    /**
     * Частичный индекс для быстрой выборки закреплённых активных заметок.
     */
    private function addPinnedPartialIndex(): void
    {
        DB::statement(
            'CREATE INDEX notes_user_id_pinned_index
             ON notes (user_id)
             WHERE is_pinned AND deleted_at IS NULL'
        );
    }
};
