<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Re-add related_store_ids (sibling/group stores) with the explicit shape the
 * admin UI now writes:
 *
 *   related_store_ids: int[]   // array of stores.id
 *
 * Used by RelatedStoresSection on the user detail page to show "系列店舗".
 * Previously the API derived siblings from heuristics; that flow is being
 * replaced by an explicit admin-curated list.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->jsonb('related_store_ids')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('related_store_ids');
        });
    }
};
