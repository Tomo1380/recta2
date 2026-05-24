<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Store geolocation columns. Populated via the admin's "住所から緯度経度を取得"
 * button (Google Geocoding API). The values drive the dynamic transfer-fee map
 * (concentric color-coded circles) and replace the previous address-string
 * iframe embed with a proper Google Maps JS instance.
 *
 * decimal(10,7) gives ~1cm precision worldwide, well past what we need.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->decimal('lat', 10, 7)->nullable()->after('address');
            $table->decimal('lng', 10, 7)->nullable()->after('lat');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn(['lat', 'lng']);
        });
    }
};
