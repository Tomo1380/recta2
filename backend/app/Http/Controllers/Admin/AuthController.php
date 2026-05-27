<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminLoginRequest;
use App\Models\AdminUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(AdminLoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $admin = AdminUser::where('email', $credentials['email'])->first();

        if (!$admin || !Hash::check($credentials['password'], $admin->password)) {
            return response()->json(['message' => 'メールアドレスまたはパスワードが正しくありません。'], 401);
        }

        if ($admin->status === 'inactive') {
            return response()->json(['message' => 'アカウントが無効化されています。'], 403);
        }

        $admin->update(['last_login_at' => now()]);

        $token = $admin->createToken('admin-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'admin' => $admin,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'ログアウトしました。']);
    }

    public function me(Request $request): JsonResponse
    {
        $admin = $request->user();

        return response()->json([
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => $admin->role,
            'status' => $admin->status,
            'last_login_at' => $admin->last_login_at,
            'created_at' => $admin->created_at,
            'updated_at' => $admin->updated_at,
            // LINE Official Manager 連携用設定（管理画面のジャンプリンクで使用）
            'line_official_account_id' => config('services.line.official_account_id'),
        ]);
    }
}
