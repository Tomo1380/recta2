<?php

namespace App\Http\Controllers;

use App\Http\Requests\User\UpdateProfileRequest;
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
    public function update(UpdateProfileRequest $request)
    {
        $request->user()->update($request->validated());

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
