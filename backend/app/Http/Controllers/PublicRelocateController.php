<?php

namespace App\Http\Controllers;

use App\Models\RelocateVoice;
use Illuminate\Http\JsonResponse;

class PublicRelocateController extends Controller
{
    /**
     * 上京サポートページの「先輩の声」セクション用。
     * visible=true のものだけ display_order 順で返す。
     */
    public function voices(): JsonResponse
    {
        $voices = RelocateVoice::where('visible', true)
            ->orderBy('display_order')
            ->orderBy('id')
            ->get(['id', 'area_from', 'area_to', 'body']);

        return response()->json($voices);
    }
}
