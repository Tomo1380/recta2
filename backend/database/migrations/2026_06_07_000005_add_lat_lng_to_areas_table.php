<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * areas に中心座標 (lat/lng) を持たせる。
 *
 * 用途: トップの「ピックアップ店舗」を、ユーザーが選んだエリアの近隣順に
 * 並べ替えるため (PublicStoreController@home の ?area=slug)。店舗側の lat/lng は
 * 手動 geocode 運用で埋まっていない事が多いので、距離計算はエリア座標を基準にする。
 *
 * 値の投入: 管理画面でエリアを作成/改名すると GeocodingService が裏で
 * エリア名を geocode して自動セットする (AreaCategoryController)。既知の
 * 10 エリアは AreaCategorySeeder に座標を持たせてあるので key 無しの
 * ローカルでも動く。geocode できなかった場合は null のまま (= 距離不明
 * として末尾に並ぶ)。
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('areas', function (Blueprint $table) {
            $table->decimal('lat', 10, 7)->nullable()->after('sort_order');
            $table->decimal('lng', 10, 7)->nullable()->after('lat');
        });
    }

    public function down(): void
    {
        Schema::table('areas', function (Blueprint $table) {
            $table->dropColumn(['lat', 'lng']);
        });
    }
};
