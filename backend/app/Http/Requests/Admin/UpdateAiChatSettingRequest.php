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

            // off          : サジェスト非表示
            // chips_only   : L2 chip のみ並べる (label/sub 非表示)
            // categorized  : L1 タブ + L2 chip
            'suggest_display_mode' => 'sometimes|in:off,chips_only,categorized',

            // suggest_categories: [{id, label, sub, chips: string[]}]
            'suggest_categories' => 'sometimes|nullable|array|max:6',
            'suggest_categories.*.id' => 'required|string|max:32',
            'suggest_categories.*.label' => 'required|string|max:40',
            'suggest_categories.*.sub' => 'nullable|string|max:60',
            'suggest_categories.*.chips' => 'required|array|max:10',
            'suggest_categories.*.chips.*' => 'required|string|max:80',
        ];
    }
}
