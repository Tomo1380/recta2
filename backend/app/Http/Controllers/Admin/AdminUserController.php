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

class AdminUserController extends Controller
{
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
        $admins = AdminUser::orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 20));

        return response()->json(PaginatorWithResource::map($admins, AdminUserResource::class));
    }

    public function store(StoreAdminUserRequest $request): AdminUserResource
    {
        $admin = AdminUser::create($request->validated());
        return new AdminUserResource($admin);
    }

    public function update(UpdateAdminUserRequest $request, AdminUser $adminUser): AdminUserResource
    {
        $adminUser->update($request->validated());
        return new AdminUserResource($adminUser);
    }

    public function resetPassword(ResetAdminPasswordRequest $request, AdminUser $adminUser): JsonResponse
    {
        $adminUser->update(['password' => $request->validated()['password']]);
        return response()->json(['message' => 'パスワードをリセットしました。']);
    }

    public function destroy(AdminUser $adminUser): JsonResponse
    {
        $adminUser->delete();
        return response()->json(null, 204);
    }
}
