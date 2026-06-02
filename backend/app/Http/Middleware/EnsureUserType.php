<?php

namespace App\Http\Middleware;

use App\Models\AdminUser;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * 認証済みトークンの tokenable モデル種別を検証するガード。
 *
 * AdminUser / User は同一の personal_access_tokens テーブルに polymorphic で
 * トークンを発行するため、`auth:sanctum` だけでは LINE ログインで発行された
 * エンドユーザートークンでも管理画面 API を通過してしまう (権限昇格)。
 * 本 middleware で「admin ルートは AdminUser のトークンのみ」「user ルートは
 * User のトークンのみ」を強制し、認証境界を明示する。
 *
 * defense-in-depth として token abilities (admin / user) も併用しているが、
 * 最終的な enforcement はこのモデル種別チェックで行う。
 */
class EnsureUserType
{
    public function handle(Request $request, Closure $next, string $type): Response
    {
        $user = $request->user();

        $expected = match ($type) {
            'admin' => AdminUser::class,
            'user' => User::class,
            default => null,
        };

        if ($expected === null || ! $user instanceof $expected) {
            abort(403, 'この操作を行う権限がありません。');
        }

        return $next($request);
    }
}
