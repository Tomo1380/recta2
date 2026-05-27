<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreIndustryKnowledgeRequest extends FormRequest
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
            'category' => 'required|string|max:50',
            'title' => 'required|string|max:200',
            'keywords' => 'required|array|min:1',
            'keywords.*' => 'string|max:50',
            'content' => 'required|string|max:5000',
            'is_active' => 'sometimes|boolean',
        ];
    }
}
