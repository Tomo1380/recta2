<?php

namespace App\Http\Resources;

use App\Models\Consultation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Consultation
 */
class ConsultationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'question' => $this->question,
            'answer' => $this->answer,
            'tag' => $this->tag,
            'count' => (int) $this->count,
            'visible' => (bool) $this->visible,
            'sort_order' => (int) $this->sort_order,
        ];
    }
}
