<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ResetAdminPasswordRequest;
use App\Http\Requests\Admin\StoreAdminUserRequest;
use App\Http\Requests\Admin\UpdateAdminUserRequest;
use App\Http\Resources\AdminUserResource;
use App\Models\AdminUser;
use App\Support\PaginatorWithResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminUserController extends Controller
{
    /**
     * 管理ユーザーの作成・更新・削除・パスワードリセットは super_admin のみ。
     * index は admin / super_admin どちらも閲覧可。
     *
     * Policy 経由ではなく controller 内ガードに留めるのは、対象 model が
     * 「現在ログイン中の AdminUser」と異種 (自身を操作するのは admin でも可)
     * というケースを後で許容しやすいため。
     */
    private function ensureSuperAdmin(Request $request): void
    {
        $actor = $request->user();
        if (!$actor || ($actor->role ?? 'admin') !== 'super_admin') {
            throw new HttpException(403, '管理ユーザーの操作には super_admin 権限が必要です。');
        }
    }

    /**
     * @response array{
     *   data: AdminUserResource[],
     *   current_page: int,
     *   last_page: int,
     *   per_page: int,
     *   total: int
     * }
     */
    public function index(Request $request): JsonResponse
    {
        // 管理ユーザー一覧は super_admin のみ閲覧可（権限管理 UI のため）。
        $this->ensureSuperAdmin($request);

        $admins = AdminUser::orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 20));

        return response()->json(PaginatorWithResource::map($admins, AdminUserResource::class));
    }

    public function store(StoreAdminUserRequest $request): AdminUserResource
    {
        $this->ensureSuperAdmin($request);
        $data = $request->validated();
        // super_admin は実効的に全権限なので permissions は保持しない。
        if (($data['role'] ?? 'admin') === 'super_admin') {
            $data['permissions'] = null;
        }
        $admin = AdminUser::create($data);
        return new AdminUserResource($admin);
    }

    public function update(UpdateAdminUserRequest $request, AdminUser $adminUser): AdminUserResource
    {
        $this->ensureSuperAdmin($request);
        $data = $request->validated();
        // パスワード未入力 (null/空) のときは既存パスワードを維持する。
        if (empty($data['password'] ?? null)) {
            unset($data['password']);
        }
        // super_admin は実効的に全権限なので permissions は保持しない。
        $effectiveRole = $data['role'] ?? $adminUser->role;
        if ($effectiveRole === 'super_admin' && array_key_exists('permissions', $data)) {
            $data['permissions'] = null;
        }

        // 最後の有効な super_admin を降格 / 無効化すると組織が締め出される。
        // 対象が現在 super_admin かつ active で、この更新で super_admin/active から
        // 外れる場合、他に active な super_admin が居なければ拒否する。
        $losingSuperAdmin = $adminUser->role === 'super_admin'
            && $adminUser->status === 'active'
            && ($effectiveRole !== 'super_admin' || ($data['status'] ?? $adminUser->status) !== 'active');
        if ($losingSuperAdmin) {
            $otherActiveSuperAdmins = AdminUser::where('role', 'super_admin')
                ->where('status', 'active')
                ->where('id', '!=', $adminUser->id)
                ->exists();
            if (! $otherActiveSuperAdmins) {
                throw new HttpException(409, '最後の super_admin を降格・無効化することはできません。');
            }
        }

        $adminUser->update($data);
        return new AdminUserResource($adminUser);
    }

    public function resetPassword(ResetAdminPasswordRequest $request, AdminUser $adminUser): JsonResponse
    {
        $this->ensureSuperAdmin($request);
        $adminUser->update(['password' => $request->validated()['password']]);
        return response()->json(['message' => 'パスワードをリセットしました。']);
    }

    public function destroy(Request $request, AdminUser $adminUser): JsonResponse
    {
        $this->ensureSuperAdmin($request);
        // 自分自身は削除できない (操作不能になる事故防止)
        if ($request->user()?->id === $adminUser->id) {
            throw new HttpException(409, '自分自身は削除できません。');
        }
        $adminUser->delete();
        return response()->json(null, 204);
    }
}
