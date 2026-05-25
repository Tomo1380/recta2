<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\RelocateVoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * 「上京した先輩の声」管理。フィールドは出身地 / 勤務地 / 本文 / 表示順 / 公開フラグ
 * のみのシンプル構成（顔写真や年齢は持たない方針）。
 */
class RelocateVoiceController extends Controller
{
    public function index(): JsonResponse
    {
        $voices = RelocateVoice::orderBy('display_order')->orderBy('id')->get();

        return response()->json($voices);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'area_from' => 'required|string|max:255',
            'area_to' => 'required|string|max:255',
            'body' => 'required|string',
            'visible' => 'boolean',
            'display_order' => 'integer',
        ]);

        $voice = RelocateVoice::create($validated);

        return response()->json($voice, 201);
    }

    public function update(Request $request, RelocateVoice $relocateVoice): JsonResponse
    {
        $validated = $request->validate([
            'area_from' => 'string|max:255',
            'area_to' => 'string|max:255',
            'body' => 'string',
            'visible' => 'boolean',
            'display_order' => 'integer',
        ]);

        $relocateVoice->update($validated);

        return response()->json($relocateVoice);
    }

    public function destroy(RelocateVoice $relocateVoice): JsonResponse
    {
        $relocateVoice->delete();

        return response()->json(null, 204);
    }

    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:relocate_voices,id',
        ]);

        foreach ($validated['ids'] as $index => $id) {
            RelocateVoice::where('id', $id)->update(['display_order' => $index]);
        }

        return response()->json(['message' => 'OK']);
    }
}
