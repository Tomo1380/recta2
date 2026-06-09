<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAdminUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $id = $this->route('adminUser')?->id ?? $this->route('adminUser');
        return [
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', Rule::unique('admin_users', 'email')->ignore($id)],
            'role' => 'sometimes|in:super_admin,admin',
            'status' => 'sometimes|in:active,inactive',
            // 編集画面からのパスワード変更 (任意)。空のときは update() 側で除外する。
            'password' => 'sometimes|nullable|string|min:8',
        ];
    }
}
