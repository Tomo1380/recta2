<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            // 営業時間を開始・終了に分離（business_hoursは互換のため残す）
            $table->string('opening_time')->nullable()->after('business_hours');  // 例: "20:00"
            $table->string('closing_time')->nullable()->after('opening_time');   // 例: "1:00", "LAST"

            // 面接可能時間を開始・終了に分離（interview_hoursは互換のため残す）
            $table->string('interview_start')->nullable()->after('interview_hours'); // 例: "14:00"
            $table->string('interview_end')->nullable()->after('interview_start');   // 例: "19:00"

            // シフト情報を独立フィールドに（scheduleオブジェクトのshift_infoを昇格）
            $table->string('shift_info')->nullable()->after('holidays'); // 例: "週2日〜OK。シフト自由制。"
        });

        // 既存データのマイグレーション: business_hours "HH:MM〜HH:MM" を分割
        DB::statement("
            UPDATE stores
            SET
                opening_time = TRIM(SPLIT_PART(business_hours, '〜', 1)),
                closing_time = TRIM(SPLIT_PART(business_hours, '〜', 2))
            WHERE business_hours IS NOT NULL AND business_hours LIKE '%〜%'
        ");

        // interview_hours "HH:MM〜HH:MM" を分割
        DB::statement("
            UPDATE stores
            SET
                interview_start = TRIM(SPLIT_PART(interview_hours, '〜', 1)),
                interview_end   = TRIM(SPLIT_PART(interview_hours, '〜', 2))
            WHERE interview_hours IS NOT NULL AND interview_hours LIKE '%〜%'
        ");

        // schedule->shift_info を shift_info カラムへ移行
        DB::statement("
            UPDATE stores
            SET shift_info = schedule->>'shift_info'
            WHERE schedule IS NOT NULL AND schedule->>'shift_info' IS NOT NULL
        ");
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn(['opening_time', 'closing_time', 'interview_start', 'interview_end', 'shift_info']);
        });
    }
};
