<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCategoryRequest extends FormRequest
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
        $categoryId = $this->route('category')?->id ?? $this->route('category');
        return [
            'name' => 'sometimes|string|max:255',
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique('categories', 'slug')->ignore($categoryId)],
            'image_url' => 'sometimes|nullable|string|max:500',
            'visible' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
        ];
    }
}
