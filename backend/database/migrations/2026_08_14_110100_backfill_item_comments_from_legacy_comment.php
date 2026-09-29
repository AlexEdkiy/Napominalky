<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Переносит непустые legacy-комментарии shopping_list_items.comment в
     * тред: по одному комментарию на пункт (первый в треде). Автор — владелец
     * пункта, метки времени — updated_at/created_at пункта, server_revision —
     * из sync_revision_sequence (комментарий уедет клиентам ближайшим pull).
     *
     * Tombstone-пункты (deleted_at IS NOT NULL) не трогаем. Саму колонку
     * comment НЕ удаляем — двухфазный вывод (колонку дропнет отдельная
     * миграция после перевода клиентов на тред).
     */
    public function up(): void
    {
        DB::statement(<<<'SQL'
            INSERT INTO shopping_list_item_comments
              (uuid, shopping_list_item_id, user_id, author_name, body, server_revision, created_at, updated_at)
            SELECT gen_random_uuid(), i.id, i.user_id, COALESCE(u.name, ''), i.comment,
                   nextval('sync_revision_sequence'),
                   COALESCE(i.updated_at, i.created_at, now()), COALESCE(i.updated_at, i.created_at, now())
            FROM shopping_list_items i JOIN users u ON u.id = i.user_id
            WHERE i.comment IS NOT NULL AND btrim(i.comment) <> '' AND i.deleted_at IS NULL
            SQL);
    }

    /**
     * No-op: перенесённые данные удалит down() миграции
     * create_shopping_list_item_comments_table (drop таблицы).
     */
    public function down(): void
    {
        // no-op
    }
};
