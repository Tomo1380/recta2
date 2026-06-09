<?php

use App\Models\AdminUser;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 管理ユーザーに granular な権限（permissions）を追加する。
 *
 * role(super_admin/admin) はそのまま残し、admin の実効範囲を permissions(JSON 配列)
 * で制御する。super_admin はコード側で全権限を暗黙的に持つ。
 *
 * 後方互換: 既存の admin ユーザーは「全権限」を backfill して、移行後にいきなり
 * アクセスを失わないようにする（運用者が後から絞る）。
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admin_users', function (Blueprint $table) {
            $table->json('permissions')->nullable()->after('status');
        });

        // 既存 admin に全権限を付与（super_admin は暗黙的に全権限なので未設定でOK）。
        DB::table('admin_users')
            ->where('role', 'admin')
            ->update(['permissions' => json_encode(AdminUser::PERMISSIONS)]);
    }

    public function down(): void
    {
        Schema::table('admin_users', function (Blueprint $table) {
            $table->dropColumn('permissions');
        });
    }
};
