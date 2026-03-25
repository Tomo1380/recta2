<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\IndustryKnowledge;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class IndustryKnowledgeController extends Controller
{
    public function index(): JsonResponse
    {
        $articles = IndustryKnowledge::orderBy('category')
            ->orderBy('sort_order')
            ->get();

        return response()->json($articles);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'category' => 'required|string|max:50',
            'title' => 'required|string|max:200',
            'keywords' => 'required|array|min:1',
            'keywords.*' => 'string|max:50',
            'content' => 'required|string|max:5000',
            'is_active' => 'sometimes|boolean',
        ]);

        $slug = Str::slug($request->input('title'), '-');
        if (IndustryKnowledge::where('slug', $slug)->exists()) {
            $slug .= '-' . Str::random(4);
        }

        $article = IndustryKnowledge::create([
            'category' => $request->input('category'),
            'slug' => $slug,
            'title' => $request->input('title'),
            'keywords' => $request->input('keywords'),
            'content' => $request->input('content'),
            'is_active' => $request->input('is_active', true),
            'sort_order' => IndustryKnowledge::max('sort_order') + 1,
        ]);

        Cache::forget('industry_knowledges');

        return response()->json($article, 201);
    }

    public function update(Request $request, IndustryKnowledge $industryKnowledge): JsonResponse
    {
        $request->validate([
            'category' => 'sometimes|string|max:50',
            'title' => 'sometimes|string|max:200',
            'keywords' => 'sometimes|array|min:1',
            'keywords.*' => 'string|max:50',
            'content' => 'sometimes|string|max:5000',
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
        ]);

        $industryKnowledge->update($request->only([
            'category', 'title', 'keywords', 'content', 'is_active', 'sort_order',
        ]));

        Cache::forget('industry_knowledges');

        return response()->json($industryKnowledge);
    }

    public function destroy(IndustryKnowledge $industryKnowledge): JsonResponse
    {
        $industryKnowledge->delete();
        Cache::forget('industry_knowledges');

        return response()->json(null, 204);
    }

    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:industry_knowledges,id',
        ]);

        foreach ($request->input('ids') as $order => $id) {
            IndustryKnowledge::where('id', $id)->update(['sort_order' => $order]);
        }

        Cache::forget('industry_knowledges');

        return response()->json(['message' => 'OK']);
    }
}
