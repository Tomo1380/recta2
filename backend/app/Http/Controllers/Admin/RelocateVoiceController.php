<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReorderRequest;
use App\Http\Requests\Admin\StoreRelocateVoiceRequest;
use App\Http\Requests\Admin\UpdateRelocateVoiceRequest;
use App\Models\RelocateVoice;
use Illuminate\Http\JsonResponse;

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

    public function store(StoreRelocateVoiceRequest $request): JsonResponse
    {
        $voice = RelocateVoice::create($request->validated());

        return response()->json($voice, 201);
    }

    public function update(UpdateRelocateVoiceRequest $request, RelocateVoice $relocateVoice): JsonResponse
    {
        $relocateVoice->update($request->validated());

        return response()->json($relocateVoice);
    }

    public function destroy(RelocateVoice $relocateVoice): JsonResponse
    {
        $relocateVoice->delete();

        return response()->json(null, 204);
    }

    public function reorder(ReorderRequest $request): JsonResponse
    {
        foreach ($request->validated()['ids'] as $index => $id) {
            RelocateVoice::where('id', $id)->update(['display_order' => $index]);
        }

        return response()->json(['message' => 'OK']);
    }
}
