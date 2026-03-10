<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class UserProfileController extends Controller
{
    /**
     * 認証ユーザー情報を返す
     */
    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    /**
     * プロフィール更新
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'nickname' => 'sometimes|string|max:50',
            'age' => 'sometimes|nullable|integer|min:18|max:99',
            'preferred_area' => 'sometimes|nullable|string|max:100',
            'preferred_category' => 'sometimes|nullable|string|max:100',
            'experience' => 'sometimes|nullable|string|max:100',
            'bio' => 'sometimes|nullable|string|max:1000',
        ]);

        $user = $request->user();
        $user->update($validated);

        return response()->json($user->fresh());
    }

    /**
     * ログアウト（現在のトークンを無効化）
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'ログアウトしました']);
    }
}
