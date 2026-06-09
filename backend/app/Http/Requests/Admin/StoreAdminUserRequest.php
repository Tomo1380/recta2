<?php

namespace App\Http\Requests\Admin;

use App\Models\AdminUser;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdminUserRequest extends FormRequest
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
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:admin_users,email',
            'password' => 'required|string|min:8',
            'role' => 'in:super_admin,admin',
            // 付与権限（admin 用）。super_admin は実効的に全権限なので任意。
            'permissions' => 'sometimes|nullable|array',
            'permissions.*' => ['string', Rule::in(AdminUser::PERMISSIONS)],
        ];
    }
}
