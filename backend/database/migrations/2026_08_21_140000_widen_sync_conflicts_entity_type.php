<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * entity_type varchar(20) → varchar(40): 'shopping_list_item_comment'
 * (26 символов) не влезал, из-за чего запись конфликта комментария роняла
 * весь push 500-кой, а outbox клиента бесконечно ретраил те же изменения.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sync_conflicts', static function (Blueprint $table): void {
            $table->string('entity_type', 40)->change();
        });
    }

    public function down(): void
    {
        Schema::table('sync_conflicts', static function (Blueprint $table): void {
            $table->string('entity_type', 20)->change();
        });
    }
};
