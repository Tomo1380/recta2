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
            // ヒーロー背景画像。フロントが先に汎用 upload endpoint へ送って得た
            // S3 URL をここで保存する (この endpoint 自体はファイルを受けない)。
            'hero_image_url' => 'nullable|string|max:2048',
        ];
    }
}
