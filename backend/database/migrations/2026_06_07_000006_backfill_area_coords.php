<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * 既存エリアの中心座標 (lat/lng) を backfill する。
 *
 * 直前の add_lat_lng_to_areas は NULL カラムを足すだけなので、本番のように
 * 既にエリアが入っている環境では座標が NULL のままになり、トップの近隣
 * ピックアップ並べ替えが無反応になる。seeder は通常デプロイで走らず
 * (ProductionSeeder もエリアが空の時しか入れない) ので、既知の slug に対して
 * ここで座標を埋める。
 *
 * 冪等: lat が既に入っている行は触らない (手動設定 / geocode 済みを尊重)。
 * 値は AreaCategorySeeder と一致させてある。
 */
return new class extends Migration {
    public function up(): void
    {
        $coords = [
            'shibuya'    => [35.6580, 139.6994],
            'shinjuku'   => [35.6938, 139.7034],
            'roppongi'   => [35.6628, 139.7315],
            'ginza'      => [35.6717, 139.7650],
            'ikebukuro'  => [35.7295, 139.7109],
            'ebisu'      => [35.6467, 139.7100],
            'azabujuban' => [35.6556, 139.7363],
            'omotesando' => [35.6655, 139.7126],
            'nakasu'     => [33.5939, 130.4017],
            'susukino'   => [43.0556, 141.3534],
        ];

        foreach ($coords as $slug => [$lat, $lng]) {
            DB::table('areas')
                ->where('slug', $slug)
                ->whereNull('lat')
                ->update(['lat' => $lat, 'lng' => $lng]);
        }
    }

    public function down(): void
    {
        // backfill のみ。カラム自体は add_lat_lng_to_areas の down で落とす。
        // ここで NULL に戻すと手動設定値まで消すため、あえて何もしない。
    }
};
