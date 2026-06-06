<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * 計測リンク（アフィリエイト/店舗別LINE導線/SNS）の新規発行。
 */
class StoreTrackingLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'label' => ['required', 'string', 'max:120'],
            'destination_url' => ['nullable', 'url', 'max:2048'],
            'code' => ['nullable', 'string', 'alpha_dash', 'max:64', 'unique:tracking_links,code'],
        ];
    }
}
