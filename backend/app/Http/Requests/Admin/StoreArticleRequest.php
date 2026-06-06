<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreArticleRequest extends FormRequest
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
            'slug' => 'nullable|string|max:200|regex:/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i',
            'title' => 'required|string|max:200',
            'excerpt' => 'nullable|string|max:500',
            'body' => 'nullable|array',
            'body_html' => 'nullable|string',
            'thumbnail_url' => 'nullable|string|max:2048',
            'category' => 'nullable|string|max:50',
            // C2: コラムTOPの大テーマ（4種）。
            'section' => 'nullable|in:夜の始め方,エリア別比較,地方から上京,Q&A',
            // C4: 「この記事で紹介した店舗」（手動紐付け）。
            'related_store_ids' => 'nullable|array',
            'related_store_ids.*' => 'integer|exists:stores,id',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'status' => 'nullable|in:draft,published',
            'published_at' => 'nullable|date',
        ];
    }
}
