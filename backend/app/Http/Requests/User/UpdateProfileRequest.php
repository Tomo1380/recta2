<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Public profile is intentionally minimal — only the nickname is
     * user-editable. Other demographic / preference fields are kept in
     * the schema for analytics but aren't exposed through the user UI
     * because we don't want to surface anything that could de-anonymise
     * reviewers.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'nickname' => 'nullable|string|max:50',
        ];
    }
}
