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
            'nickname' => 'nullable|string|max:50',
            'age' => 'nullable|integer|min:18|max:99',
            'preferred_area' => 'nullable|string|max:50',
            'preferred_category' => 'nullable|string|max:50',
            'experience' => 'nullable|string|max:50',
            'bio' => 'nullable|string|max:500',
        ]);

        $request->user()->update($validated);

        return response()->json($request->user()->fresh());
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
