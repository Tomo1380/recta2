<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pre-release cleanup of stores columns that were designed but never wired up to
 * the user UI or the admin form. Dropping them here keeps the schema honest and
 * prevents future contributors from re-using stale shapes by accident.
 *
 * Columns dropped (and rationale):
 *  - rank                    : seed used S/A/B/C but never displayed/filtered on
 *  - cast_profile            : no admin input, no UI render
 *  - popular_features        : interface declared, but no JSX consumer
 *  - transfer_map_image_url  : displayed in UI but no upload UI; we render text only
 *  - transfer_zones          : will be re-added with a refined contract in the
 *                              next migration so the admin editor can write it
 *  - salary_simulator        : the section now derives from hourly_min only
 *  - related_store_ids       : will be re-added in a dedicated migration so the
 *                              admin can select sibling stores explicitly
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn([
                'rank',
                'cast_profile',
                'popular_features',
                'transfer_map_image_url',
                'transfer_zones',
                'salary_simulator',
                'related_store_ids',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->string('rank')->nullable();
            $table->jsonb('cast_profile')->nullable();
            $table->jsonb('popular_features')->nullable();
            $table->string('transfer_map_image_url')->nullable();
            $table->jsonb('transfer_zones')->nullable();
            $table->jsonb('salary_simulator')->nullable();
            $table->jsonb('related_store_ids')->nullable();
        });
    }
};
