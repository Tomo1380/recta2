<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreFineTuningQaRequest extends FormRequest
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
            'category' => 'nullable|string|max:100',
            'question' => 'required|string',
            'answer' => 'required|string',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'source' => 'nullable|string|max:50',
            'status' => 'nullable|in:active,draft,archived',
        ];
    }
}
