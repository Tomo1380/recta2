<?php

namespace App\Http\Middleware;

use App\Models\AdminUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * 管理ユーザーの granular 権限を強制するガード。
 *
 * `auth:sanctum` + `user.type:admin` の内側で使う前提（AdminUser であることは
 * 既に保証されている）。指定された権限キーを持たない admin は 403。
 * super_admin は AdminUser::hasPermission() 側で常に true になる。
 *
 * 例: Route::middleware('admin.perm:stores')->group(...)
 */
class EnsureAdminPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (! $user instanceof AdminUser || ! $user->hasPermission($permission)) {
            abort(403, 'この操作を行う権限がありません。');
        }

        return $next($request);
    }
}
