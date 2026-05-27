<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAiChatSettingRequest extends FormRequest
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
            'enabled' => 'sometimes|boolean',
            'system_prompt' => 'sometimes|nullable|string',
            'tone' => 'sometimes|in:casual,formal,friendly',
            'suggest_buttons' => 'sometimes|nullable|array',
        ];
    }
}
