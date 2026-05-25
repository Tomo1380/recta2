<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePickupShopRequest extends FormRequest
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
            'store_id' => 'sometimes|integer|exists:stores,id',
            'sort_order' => 'sometimes|integer',
            'is_pr' => 'sometimes|boolean',
            'visible' => 'sometimes|boolean',
        ];
    }
}
