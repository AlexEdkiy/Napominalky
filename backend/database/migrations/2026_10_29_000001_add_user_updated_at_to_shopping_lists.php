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
            $table->timestamp('user_updated_at')->nullable();
        });

        // Conservative starting point: old rows do not identify whether their
        // last save was a direct edit or a recalculation. Never infer a deletion.
        DB::table('shopping_lists')->update(['user_updated_at' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('shopping_lists', function (Blueprint $table): void {
            $table->dropColumn('user_updated_at');
        });
    }
};
