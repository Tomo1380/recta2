<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBannerSettingsRequest extends FormRequest
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
            'hero_tagline' => 'nullable|string',
            'hero_subtitle' => 'nullable|string',
            'hero_badge' => 'nullable|string',
            'hero_ai_label' => 'nullable|string',
        ];
    }
}
