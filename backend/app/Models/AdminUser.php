<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class AdminUser extends Authenticatable
{
    use HasApiTokens, HasFactory;

    /**
     * 付与可能な権限キーの正準リスト。各キーは管理画面のセクション（ナビ）に対応する。
     * super_admin は全権限を暗黙的に保持する（管理ユーザー管理も含む）。
     */
    public const PERMISSIONS = [
        'analytics', // ダッシュボード・アクセス解析・計測リンク
        'chat',      // ユーザー管理・LINE対応
        'stores',    // 店舗管理・エリア/カテゴリ
        'reviews',   // 口コミ管理
        'ai_chat',   // AIチャット設定・業界ナレッジ
        'articles',  // コラム管理
        'content',   // コンテンツ・上京者の声
    ];

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'status',
        'permissions',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'password' => 'hashed',
        'permissions' => 'array',
        'last_login_at' => 'datetime',
    ];

    /**
     * 指定権限を持つか。super_admin は常に true。
     */
    public function hasPermission(string $permission): bool
    {
        if ($this->role === 'super_admin') {
            return true;
        }

        return in_array($permission, $this->permissions ?? [], true);
    }

    /**
     * 実効権限（フロントのナビ表示用）。super_admin は全権限。
     *
     * @return array<int, string>
     */
    public function effectivePermissions(): array
    {
        if ($this->role === 'super_admin') {
            return self::PERMISSIONS;
        }

        // 不正・廃止されたキーは弾く
        return array_values(array_intersect($this->permissions ?? [], self::PERMISSIONS));
    }
}
