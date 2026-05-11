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
        // Public profile is intentionally minimal — only the nickname is
        // user-editable. Other demographic / preference fields are kept in
        // the schema for analytics but aren't exposed through the user UI
        // because we don't want to surface anything that could de-anonymise
        // reviewers.
        $validated = $request->validate([
            'nickname' => 'nullable|string|max:50',
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
