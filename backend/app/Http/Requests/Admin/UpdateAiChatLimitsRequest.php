<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAiChatLimitsRequest extends FormRequest
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
            'user_daily_limit' => 'sometimes|integer|min:1',
            'user_monthly_limit' => 'sometimes|integer|min:1',
            'ip_daily_limit' => 'sometimes|integer|min:1',
            'global_daily_limit' => 'sometimes|integer|min:1',
            'limit_reached_message' => 'sometimes|string|max:500',
        ];
    }
}
