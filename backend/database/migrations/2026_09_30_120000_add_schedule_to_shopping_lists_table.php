<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shopping_lists', function (Blueprint $table): void {
            $table->date('manual_deadline')->nullable();
            $table->timestampTz('manual_reminder_at')->nullable();
            $table->date('deadline')->nullable();
            $table->timestampTz('reminder_at')->nullable();
        });

        DB::statement(<<<'SQL'
            UPDATE shopping_lists AS lists
            SET deadline = dates.deadline, reminder_at = dates.reminder_at,
                server_revision = nextval('sync_revision_sequence'), updated_at = CURRENT_TIMESTAMP
            FROM (
                SELECT shopping_list_id, MIN(deadline) AS deadline, MIN(reminder_at) AS reminder_at
                FROM shopping_list_items
                WHERE deleted_at IS NULL AND is_checked = false
                GROUP BY shopping_list_id
            ) AS dates
            WHERE lists.id = dates.shopping_list_id AND lists.type = 'tasks'
              AND lists.deleted_at IS NULL
              AND (dates.deadline IS NOT NULL OR dates.reminder_at IS NOT NULL)
            SQL);
    }

    public function down(): void
    {
        Schema::table('shopping_lists', function (Blueprint $table): void {
            $table->dropColumn(['manual_deadline', 'manual_reminder_at', 'deadline', 'reminder_at']);
        });
    }
};
