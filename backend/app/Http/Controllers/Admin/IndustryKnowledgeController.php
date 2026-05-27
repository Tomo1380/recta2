<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReorderRequest;
use App\Http\Requests\Admin\StoreIndustryKnowledgeRequest;
use App\Http\Requests\Admin\UpdateIndustryKnowledgeRequest;
use App\Models\IndustryKnowledge;
use Illuminate\Http\JsonResponse;
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

    public function store(StoreIndustryKnowledgeRequest $request): JsonResponse
    {
        $data = $request->validated();

        $slug = Str::slug($data['title'], '-');
        if (IndustryKnowledge::where('slug', $slug)->exists()) {
            $slug .= '-' . Str::random(4);
        }

        $article = IndustryKnowledge::create([
            'category' => $data['category'],
            'slug' => $slug,
            'title' => $data['title'],
            'keywords' => $data['keywords'],
            'content' => $data['content'],
            'is_active' => $data['is_active'] ?? true,
            'sort_order' => IndustryKnowledge::max('sort_order') + 1,
        ]);

        Cache::forget('industry_knowledges');

        return response()->json($article, 201);
    }

    public function update(UpdateIndustryKnowledgeRequest $request, IndustryKnowledge $industryKnowledge): JsonResponse
    {
        $industryKnowledge->update($request->validated());

        Cache::forget('industry_knowledges');

        return response()->json($industryKnowledge);
    }

    public function destroy(IndustryKnowledge $industryKnowledge): JsonResponse
    {
        $industryKnowledge->delete();
        Cache::forget('industry_knowledges');

        return response()->json(null, 204);
    }

    public function reorder(ReorderRequest $request): JsonResponse
    {
        foreach ($request->validated()['ids'] as $order => $id) {
            IndustryKnowledge::where('id', $id)->update(['sort_order' => $order]);
        }

        Cache::forget('industry_knowledges');

        return response()->json(['message' => 'OK']);
    }
}
