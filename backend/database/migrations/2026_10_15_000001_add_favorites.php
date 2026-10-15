<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['notes', 'shopping_lists', 'shopping_list_items', 'reminders'] as $name) {
            Schema::table($name, function (Blueprint $table): void {
                $table->boolean('is_favorite')->default(false);
            });
        }
    }

    public function down(): void
    {
        foreach (['notes', 'shopping_lists', 'shopping_list_items', 'reminders'] as $name) {
            Schema::table($name, function (Blueprint $table): void {
                $table->dropColumn('is_favorite');
            });
        }
    }
};
