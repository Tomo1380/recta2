<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateArticleRequest extends FormRequest
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
            'slug' => 'sometimes|nullable|string|max:200|regex:/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i',
            'title' => 'sometimes|required|string|max:200',
            'excerpt' => 'sometimes|nullable|string|max:500',
            'body' => 'sometimes|nullable|array',
            'body_html' => 'sometimes|nullable|string',
            'thumbnail_url' => 'sometimes|nullable|string|max:2048',
            'category' => 'sometimes|nullable|string|max:50',
            'section' => 'sometimes|nullable|in:夜の始め方,エリア別比較,地方から上京,Q&A',
            'related_store_ids' => 'sometimes|nullable|array',
            'related_store_ids.*' => 'integer|exists:stores,id',
            'tags' => 'sometimes|nullable|array',
            'tags.*' => 'string|max:50',
            'status' => 'sometimes|nullable|in:draft,published',
            'published_at' => 'sometimes|nullable|date',
        ];
    }
}
