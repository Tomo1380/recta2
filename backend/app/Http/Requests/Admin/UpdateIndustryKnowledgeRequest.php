<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateIndustryKnowledgeRequest extends FormRequest
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
            'category' => 'sometimes|string|max:50',
            'title' => 'sometimes|string|max:200',
            'keywords' => 'sometimes|array|min:1',
            'keywords.*' => 'string|max:50',
            'content' => 'sometimes|string|max:5000',
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
        ];
    }
}
