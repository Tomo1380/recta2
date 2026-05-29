<?php

namespace App\Http\Controllers;

use App\Models\IndustryKnowledge;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * Recta 業界用語集 (Glossary) の公開 API。
 *
 * IndustryKnowledge テーブルは AI チャット用に蓄積されてきたが、
 * 「キャバクラ ノルマ」「バックとは」等の情報検索 KW に対する
 * 独立メディアとして公開する。
 *
 * 一覧 (/api/glossary) はカテゴリ別 group 化、詳細 (/api/glossary/{slug})
 * は同カテゴリの関連 entry も含めて返す。Redis tag キャッシュ 1 時間。
 */
class PublicGlossaryController extends Controller
{
    private const CACHE_TTL = 3600;

    public function index(): JsonResponse
    {
        $payload = Cache::remember(
            'glossary:index',
            self::CACHE_TTL,
            function () {
                $all = IndustryKnowledge::where('is_active', true)
                    ->orderBy('sort_order')
                    ->orderBy('id')
                    ->get(['id', 'category', 'slug', 'title', 'content', 'updated_at']);

                $grouped = $all->groupBy('category')->map(fn ($items) => $items->values()->toArray());

                return [
                    'categories' => $grouped->keys()->all(),
                    'entries' => $grouped->all(),
                    'total' => $all->count(),
                ];
            },
        );

        return response()->json($payload);
    }

    public function show(string $slug): JsonResponse
    {
        $payload = Cache::remember(
            "glossary:show:{$slug}",
            self::CACHE_TTL,
            function () use ($slug) {
                $entry = IndustryKnowledge::where('slug', $slug)
                    ->where('is_active', true)
                    ->firstOrFail();

                $related = IndustryKnowledge::where('is_active', true)
                    ->where('category', $entry->category)
                    ->where('id', '!=', $entry->id)
                    ->orderBy('sort_order')
                    ->limit(5)
                    ->get(['slug', 'title']);

                return [
                    'entry' => $entry,
                    'related' => $related,
                ];
            },
        );

        return response()->json($payload);
    }
}
