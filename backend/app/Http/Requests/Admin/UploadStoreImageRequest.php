<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UploadStoreImageRequest extends FormRequest
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
        // HEIC/HEIF (iPhone 標準) も受け付ける。`image` ルールは getimagesize()
        // ベースで HEIC を画像と認識せず弾いてしまうため使わず、mimes で許可する
        // (HEIC はアップロード後に MediaStorage が JPEG へ変換する)。
        //
        // max は 15MB (15360KB)。スマホ実機の高解像度写真 (48MP JPEG や HEIC) は
        // 5〜12MB になりうるため。nginx (20M) / PHP upload_max_filesize (20M) の
        // 範囲内かつ HEIC→JPEG 変換時の memory_limit (256M) に耐える上限に揃える。
        return [
            'image' => 'required|file|mimes:jpg,jpeg,png,webp,heic,heif|max:15360',
        ];
    }
}
