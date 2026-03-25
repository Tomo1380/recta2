<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Composite index for the most common filter: published + category
        Schema::table('stores', function (Blueprint $table) {
            $table->index(['publish_status', 'category'], 'idx_stores_status_category');
            $table->index(['publish_status', 'area'], 'idx_stores_status_area');
            $table->index(['publish_status', 'created_at'], 'idx_stores_status_created');
        });

        // GIN index for feature_tags JSONB (used by whereJsonContains)
        DB::statement('CREATE INDEX idx_stores_feature_tags ON stores USING GIN (feature_tags)');

        // Trigram indexes for ILIKE keyword search (description, features_text)
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        DB::statement('CREATE INDEX idx_stores_description_trgm ON stores USING GIN (description gin_trgm_ops)');
        DB::statement('CREATE INDEX idx_stores_features_text_trgm ON stores USING GIN (features_text gin_trgm_ops)');
        DB::statement('CREATE INDEX idx_stores_name_trgm ON stores USING GIN (name gin_trgm_ops)');

        // Industry knowledges - keywords GIN index
        DB::statement('CREATE INDEX idx_knowledge_keywords ON industry_knowledges USING GIN (keywords)');
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropIndex('idx_stores_status_category');
            $table->dropIndex('idx_stores_status_area');
            $table->dropIndex('idx_stores_status_created');
        });

        DB::statement('DROP INDEX IF EXISTS idx_stores_feature_tags');
        DB::statement('DROP INDEX IF EXISTS idx_stores_description_trgm');
        DB::statement('DROP INDEX IF EXISTS idx_stores_features_text_trgm');
        DB::statement('DROP INDEX IF EXISTS idx_stores_name_trgm');
        DB::statement('DROP INDEX IF EXISTS idx_knowledge_keywords');
    }
};
