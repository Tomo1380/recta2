<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAreaRequest extends FormRequest
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
        $areaId = $this->route('area')?->id ?? $this->route('area');
        return [
            'name' => 'sometimes|string|max:255',
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique('areas', 'slug')->ignore($areaId)],
            'visible' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
        ];
    }
}
