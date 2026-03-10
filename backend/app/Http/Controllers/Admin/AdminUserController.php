<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $admins = AdminUser::orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 20));

        return response()->json($admins);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:admin_users,email',
            'password' => 'required|string|min:8',
            'role' => 'in:super_admin,admin',
        ]);

        $admin = AdminUser::create($request->only(['name', 'email', 'password', 'role']));

        return response()->json($admin, 201);
    }

    public function update(Request $request, AdminUser $adminUser): JsonResponse
    {
        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:admin_users,email,' . $adminUser->id,
            'role' => 'sometimes|in:super_admin,admin',
            'status' => 'sometimes|in:active,inactive',
        ]);

        $adminUser->update($request->only(['name', 'email', 'role', 'status']));

        return response()->json($adminUser);
    }

    public function resetPassword(Request $request, AdminUser $adminUser): JsonResponse
    {
        $request->validate([
            'password' => 'required|string|min:8',
        ]);

        $adminUser->update(['password' => $request->password]);

        return response()->json(['message' => 'パスワードをリセットしました。']);
    }

    public function destroy(AdminUser $adminUser): JsonResponse
    {
        $adminUser->delete();

        return response()->json(null, 204);
    }
}
