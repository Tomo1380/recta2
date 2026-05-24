<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Re-add transfer_zones (distance-based pickup fee table) with the contract the
 * admin UI now writes:
 *
 *   transfer_zones: [
 *     { label?: string, radius_km?: number|string, fee?: number, color?: string },
 *     ...
 *   ]
 *
 * This is mainly used by high-end venues in 六本木/銀座 that pay 足代 instead of
 * physically driving women home.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->jsonb('transfer_zones')->nullable()->after('transfer_km');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('transfer_zones');
        });
    }
};
