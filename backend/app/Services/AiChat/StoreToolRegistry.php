<?php

namespace App\Services\AiChat;

use App\Models\Area;
use App\Models\Article;
use App\Models\Category;
use App\Models\IndustryKnowledge;
use App\Models\Store;
use Illuminate\Support\Facades\Cache;

/**
 * Gemini Function Calling から呼ばれる tool 群を集約する。
 *
 * Phase 2-1a で AiChatController から切り出し。
 * - getDeclarations(): Gemini に渡す tool 定義
 * - execute($name, $args): tool name でディスパッチして結果を返す
 *
 * Each tool method は配列を返す（Gemini 側に JSON-encode して渡される）。
 * 個別 tool method (toolSearchStores 等) は internal で private にせず
 * テスト容易性のため public にしてある。
 */
class StoreToolRegistry
{
    /**
     * @return array<int, array<string, mixed>> Gemini Function Calling の宣言形式
     */
    public function getDeclarations(): array
    {
        return [
            [
                'name' => 'search_stores',
                'description' => '条件に合うナイトワーク求人を検索する。エリア・カテゴリ・時給・特徴タグ・最寄り駅・体入・保証制度などで絞り込み可能。条件が曖昧な場合はkeywordでフリーワード検索を使う。必ず何かしらの検索を実行すること。',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'area' => [
                            'type' => 'string',
                            'description' => 'エリア名1つ（例: 新宿, 六本木, 銀座, 渋谷, 池袋, 恵比寿, 麻布十番, 表参道）',
                        ],
                        'category' => [
                            'type' => 'string',
                            'description' => '業種カテゴリ（例: キャバクラ, ラウンジ, ガールズバー, コンカフェ, クラブ, ニュークラブ）',
                        ],
                        'min_hourly' => [
                            'type' => 'integer',
                            'description' => '最低時給の下限（例: 3000 → 時給3000円以上のお店）',
                        ],
                        'max_hourly' => [
                            'type' => 'integer',
                            'description' => '時給の上限（例: 5000 → 時給5000円以下のお店。初心者向けなど）',
                        ],
                        'tags' => [
                            'type' => 'array',
                            'items' => ['type' => 'string'],
                            'description' => '特徴タグで絞り込み（例: ["未経験歓迎", "日払いあり", "送りあり", "終電上がりOK", "ノルマなし", "体入全額日払い", "髪色自由", "ネイルOK", "経験者優遇", "高時給", "駅チカ"]）',
                        ],
                        'nearest_station' => [
                            'type' => 'string',
                            'description' => '最寄り駅名（例: 六本木駅, 新宿駅, 銀座駅）',
                        ],
                        'same_day_trial' => [
                            'type' => 'boolean',
                            'description' => '当日体験入店（体入）可能なお店のみ検索する場合true',
                        ],
                        'has_guarantee' => [
                            'type' => 'boolean',
                            'description' => '保証制度（保証期間）ありのお店のみ検索する場合true',
                        ],
                        'keyword' => [
                            'type' => 'string',
                            'description' => 'フリーワード検索。店名・説明文・特徴テキスト・スタッフコメント・最寄り駅・住所を横断検索。スペース区切りで複数キーワードOR検索可能（例: "アットホーム 明るい"）。雰囲気で探す場合に有効',
                        ],
                        'sort' => [
                            'type' => 'string',
                            'enum' => ['newest', 'hourly_desc', 'hourly_asc', 'popular'],
                            'description' => 'ソート順（newest: 新着順, hourly_desc: 時給高い順, hourly_asc: 時給低い順, popular: 人気順）',
                        ],
                        'limit' => [
                            'type' => 'integer',
                            'description' => '取得件数（デフォルト5、最大10）',
                        ],
                    ],
                ],
            ],
            [
                'name' => 'get_store_detail',
                'description' => '特定の店舗の全詳細情報を取得する。時給・バック・ノルマ・保証・体入・雰囲気・営業時間・スタッフコメントなど。search_storesの結果から店舗IDを指定。比較質問やより詳しい情報が必要な場合に使う。',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'store_id' => [
                            'type' => 'integer',
                            'description' => '店舗ID（search_storesの結果に含まれるid）',
                        ],
                    ],
                    'required' => ['store_id'],
                ],
            ],
            [
                'name' => 'get_areas',
                'description' => '利用可能なエリア一覧を取得する。ユーザーがエリアについて聞いた時や、どんなエリアがあるか知りたい場合に使う。',
                'parameters' => [
                    'type' => 'object',
                    'properties' => (object)[],
                ],
            ],
            [
                'name' => 'get_categories',
                'description' => '利用可能な業種カテゴリ一覧を取得する。ユーザーが業種について聞いた時や、どんな業種があるか知りたい場合に使う。',
                'parameters' => [
                    'type' => 'object',
                    'properties' => (object)[],
                ],
            ],
            [
                'name' => 'get_industry_knowledge',
                'description' => 'ナイトワーク業界の用語・仕組み・マナー・手続きの知識記事を取得する。ユーザーが業界用語（ノルマ、バック、体入、同伴、アフター、指名等）や業界の仕組み（税金、服装、キャバクラとラウンジの違い等）について質問した場合に使う。店舗検索ではなく業界知識が必要な質問専用。',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'topic' => [
                            'type' => 'string',
                            'description' => '知りたいトピック（例: "ノルマ", "体入", "キャバクラとラウンジの違い", "服装", "税金", "バック", "同伴", "指名"）',
                        ],
                    ],
                    'required' => ['topic'],
                ],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function execute(string $name, array $args): array
    {
        return match ($name) {
            'search_stores' => $this->searchStores($args),
            'get_store_detail' => $this->getStoreDetail($args),
            'get_areas' => $this->getAreas(),
            'get_categories' => $this->getCategories(),
            'get_industry_knowledge' => $this->getIndustryKnowledge($args),
            default => ['error' => "Unknown tool: {$name}"],
        };
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function searchStores(array $args): array
    {
        $query = Store::where('publish_status', 'published');

        if (!empty($args['area'])) {
            $query->where('area', 'ilike', "%{$args['area']}%");
        }
        if (!empty($args['category'])) {
            $query->where('category', 'ilike', "%{$args['category']}%");
        }
        if (!empty($args['min_hourly'])) {
            $query->where('wage->regular->min', '>=', (int) $args['min_hourly']);
        }
        if (!empty($args['max_hourly'])) {
            $query->where('wage->regular->min', '<=', (int) $args['max_hourly']);
        }
        if (!empty($args['nearest_station'])) {
            $query->where('nearest_station', 'ilike', "%{$args['nearest_station']}%");
        }
        if (!empty($args['same_day_trial'])) {
            // 体入タイプは enum string 'same_day' に正規化済み。
            $query->where('guarantee->same_day_trial', 'same_day');
        }
        if (!empty($args['has_guarantee'])) {
            $query->whereNotNull('guarantee->period')->where('guarantee->period', '!=', '');
        }
        if (!empty($args['keyword'])) {
            $keywords = preg_split('/[\s　,、]+/u', trim($args['keyword']));
            $keywords = array_filter($keywords, fn ($k) => mb_strlen($k) > 0);
            // OR across keywords; unaccent() for accent-insensitive (Lumière = Lumiere)
            $query->where(function ($q) use ($keywords) {
                foreach ($keywords as $kw) {
                    $q->orWhere(function ($sub) use ($kw) {
                        $sub->whereRaw('unaccent(name) ILIKE unaccent(?)', ["%{$kw}%"])
                            ->orWhereRaw("unaccent(COALESCE(description,'')) ILIKE unaccent(?)", ["%{$kw}%"])
                            ->orWhere('nearest_station', 'ilike', "%{$kw}%")
                            ->orWhereRaw("unaccent(COALESCE(features_text,'')) ILIKE unaccent(?)", ["%{$kw}%"])
                            ->orWhere('address', 'ilike', "%{$kw}%")
                            ->orWhereRaw("unaccent(COALESCE(staff_comment::text,'')) ILIKE unaccent(?)", ["%{$kw}%"]);
                    });
                }
            });
        }
        if (!empty($args['tags'])) {
            foreach ($args['tags'] as $tag) {
                $tag = trim($tag);
                $query->where(function ($q) use ($tag) {
                    $q->whereJsonContains('feature_tags', $tag)
                      ->orWhere('features_text', 'ilike', "%{$tag}%");
                });
            }
        }

        $sort = $args['sort'] ?? 'newest';
        match ($sort) {
            'hourly_desc' => $query->orderBy('wage->regular->max', 'desc'),
            'hourly_asc' => $query->orderBy('wage->regular->min', 'asc'),
            'popular' => $query->withCount(['reviews' => fn ($q) => $q->where('status', 'published')])->orderByDesc('reviews_count'),
            default => $query->orderByDesc('created_at'),
        };

        $limit = min((int) ($args['limit'] ?? 5), 10);
        $stores = $query->limit($limit)->get();

        return [
            'count' => $stores->count(),
            'stores' => $stores->map(fn ($s) => $this->storeToSearchCard($s))->values()->toArray(),
        ];
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function getStoreDetail(array $args): array
    {
        $store = Store::find($args['store_id'] ?? 0);
        if (!$store || $store->publish_status !== 'published') {
            return ['error' => '店舗が見つかりませんでした。'];
        }

        $schedule    = is_array($store->schedule)     ? $store->schedule     : [];
        $wage        = is_array($store->wage)         ? $store->wage         : [];
        $compensation= is_array($store->compensation) ? $store->compensation : [];
        $guarantee   = is_array($store->guarantee)    ? $store->guarantee    : [];
        $interview   = is_array($store->interview)    ? $store->interview    : [];
        $castProfile = is_array($store->cast_profile) ? $store->cast_profile : [];
        $dressCode   = is_array($store->dress_code)   ? $store->dress_code   : [];
        $regular     = $wage['regular']  ?? [];
        $trial       = $wage['trial']    ?? [];
        $payroll     = $wage['payroll']  ?? [];

        return [
            'id' => $store->id,
            'name' => $store->name,
            'area' => $store->area,
            'address' => $store->address,
            'nearest_station' => $store->nearest_station,
            'category' => $store->category,
            'business_hours' => $schedule['hours_text'] ?? null,
            'holidays' => $schedule['holidays'] ?? null,
            'hourly_min' => $regular['min'] ?? null,
            'hourly_max' => $regular['max'] ?? null,
            'daily_estimate' => $wage['daily_estimate'] ?? null,
            'back_items' => $compensation['back'] ?? null,
            'fee_items' => $compensation['fees'] ?? null,
            'salary_notes' => $compensation['notes'] ?? null,
            'guarantee_period' => $guarantee['period'] ?? null,
            'guarantee_details' => $guarantee['details'] ?? null,
            'norma_info' => $guarantee['norma'] ?? null,
            'trial_hourly_min' => $trial['hourly_min'] ?? $trial['avg_hourly'] ?? null,
            'trial_hourly_max' => $trial['hourly_max'] ?? $trial['hourly'] ?? null,
            // 体入タイプ: 'same_day' | 'normal' | 'none' (enum string)
            'trial_type' => in_array($guarantee['same_day_trial'] ?? null, ['same_day', 'normal', 'none'], true)
                ? $guarantee['same_day_trial'] : 'none',
            'interview_hours' => (isset($interview['start']) || isset($interview['end']))
                ? (($interview['start'] ?? '') . '〜' . ($interview['end'] ?? ''))
                : null,
            'interview_info' => $interview ?: null,
            'required_documents' => $store->required_documents,
            'schedule' => $store->schedule,
            'recent_hires_summary' => $store->recent_hires_summary,
            'popular_features' => $store->popular_features,
            'analysis' => $store->analysis,
            'recruitment_standards' => $interview['recruitment_standards'] ?? null,
            'rank' => $store->rank,
            'gal_point' => $castProfile['gal'] ?? null,
            'loose_point' => $castProfile['loose'] ?? null,
            'age_point' => $castProfile['age'] ?? null,
            'waiwai_point' => $castProfile['waiwai'] ?? null,
            'cute_point' => $castProfile['cute'] ?? null,
            'unit_wage_type' => isset($regular['unit'])
                ? ($regular['unit'] === 'day' ? '日給' : '時給')
                : null,
            'payroll_system_type' => $payroll['type'] ?? null,
            'payroll_system_description' => $payroll['description'] ?? null,
            'dress_code' => $dressCode['description'] ?? null,
            'champagne_description' => $store->champagne_description,
            'transfer_description' => $store->transfer_description,
            'transfer_km' => $store->transfer_km,
            'feature_tags' => $store->feature_tags ?? [],
            'description' => $store->description,
            'features_text' => $store->features_text,
            'images' => $store->images ?? [],
            // 旧 video_url 互換: 動画は store_videos に分離されたので 1 本目を採用
            'video_url' => optional($store->videos()->orderBy('display_order')->first())->video_url,
            'staff_comment' => $store->staff_comment,
            'qa' => $store->qa,
            'average_rating' => round($store->averageRating(), 1),
            'reviews_count' => $store->reviewCount(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getAreas(): array
    {
        $areas = Area::orderBy('sort_order')->get(['id', 'name', 'slug']);
        return ['areas' => $areas->toArray()];
    }

    /**
     * @return array<string, mixed>
     */
    public function getCategories(): array
    {
        $categories = Category::orderBy('sort_order')->get(['id', 'name', 'slug']);
        return ['categories' => $categories->toArray()];
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function getIndustryKnowledge(array $args): array
    {
        $topic = trim($args['topic'] ?? '');
        if (!$topic) {
            return ['articles' => [], 'message' => 'トピックを指定してください'];
        }

        $allArticles = Cache::remember('industry_knowledges', 600, function () {
            $knowledge = IndustryKnowledge::where('is_active', true)
                ->orderBy('sort_order')
                ->get(['title', 'category', 'keywords', 'content'])
                ->map(fn ($k) => [
                    'title' => $k->title,
                    'category' => $k->category,
                    'keywords' => $k->keywords ?? [],
                    'content' => $k->content,
                    'source' => 'knowledge',
                ])
                ->toArray();

            // Articles are also part of the AI knowledge base. Use title + excerpt + plain
            // body text. tags act as additional keyword hints for matching.
            $articles = Article::published()
                ->get(['title', 'category', 'tags', 'excerpt', 'body_html', 'slug'])
                ->map(function ($a) {
                    $plain = trim(preg_replace('/\s+/u', ' ', strip_tags((string) $a->body_html)));
                    return [
                        'title' => $a->title,
                        'category' => $a->category ?: 'コラム',
                        'keywords' => $a->tags ?? [],
                        'content' => trim(($a->excerpt ? $a->excerpt . "\n\n" : '') . $plain),
                        'source' => 'article',
                        'slug' => $a->slug,
                    ];
                })
                ->toArray();

            return array_merge($knowledge, $articles);
        });

        $matched = [];

        foreach ($allArticles as $article) {
            $score = 0;
            $keywords = $article['keywords'] ?? [];

            foreach ($keywords as $kw) {
                if (mb_strtolower($kw) === mb_strtolower($topic)) {
                    $score = 100;
                    break;
                }
            }

            if ($score === 0) {
                foreach ($keywords as $kw) {
                    if (mb_stripos($kw, $topic) !== false || mb_stripos($topic, $kw) !== false) {
                        $score = max($score, 80);
                    }
                }
            }

            if ($score === 0 && mb_stripos($article['title'], $topic) !== false) {
                $score = 60;
            }

            if ($score === 0 && mb_stripos($article['content'], $topic) !== false) {
                $score = 40;
            }

            if ($score > 0) {
                $matched[] = [
                    'title' => $article['title'],
                    'category' => $article['category'],
                    'content' => $article['content'],
                    'score' => $score,
                ];
            }
        }

        usort($matched, fn ($a, $b) => $b['score'] - $a['score']);
        $results = array_slice($matched, 0, 3);
        $results = array_map(
            fn ($r) => ['title' => $r['title'], 'category' => $r['category'], 'content' => $r['content']],
            $results,
        );

        if (empty($results)) {
            return ['articles' => [], 'message' => '該当するナレッジが見つかりませんでした。LINEで担当者にご相談ください。'];
        }

        return ['articles' => $results];
    }

    /**
     * search_stores の結果に詰めるカード形式（Gemini が読みやすい・かつフロントに転送する用）。
     *
     * @return array<string, mixed>
     */
    private function storeToSearchCard(Store $s): array
    {
        $schedule  = is_array($s->schedule) ? $s->schedule : [];
        $wage      = is_array($s->wage) ? $s->wage : [];
        $guarantee = is_array($s->guarantee) ? $s->guarantee : [];
        $regular   = $wage['regular'] ?? [];
        $trial     = $wage['trial'] ?? [];
        $payroll   = $wage['payroll'] ?? [];
        $dressCode = is_array($s->dress_code) ? $s->dress_code : [];

        return [
            'id' => $s->id,
            'name' => $s->name,
            'area' => $s->area,
            'category' => $s->category,
            'nearest_station' => $s->nearest_station,
            'hourly_min' => $regular['min'] ?? null,
            'hourly_max' => $regular['max'] ?? null,
            'daily_estimate' => $wage['daily_estimate'] ?? null,
            // 体入タイプ: 'same_day' | 'normal' | 'none' (enum string)
            'trial_type' => in_array($guarantee['same_day_trial'] ?? null, ['same_day', 'normal', 'none'], true)
                ? $guarantee['same_day_trial'] : 'none',
            'trial_hourly_min' => $trial['hourly_min'] ?? $trial['avg_hourly'] ?? null,
            'trial_hourly_max' => $trial['hourly_max'] ?? $trial['hourly'] ?? null,
            'guarantee_period' => $guarantee['period'] ?? null,
            'feature_tags' => $s->feature_tags ?? [],
            'business_hours' => $schedule['hours_text'] ?? null,
            'opening_time' => $schedule['open'] ?? null,
            'closing_time' => $schedule['close'] ?? null,
            'shift_info' => $schedule['shift_info'] ?? null,
            'payroll_system_type' => $payroll['type'] ?? null,
            'transfer_km' => $s->transfer_km,
            'dress_code' => $dressCode['description'] ?? null,
            'description' => $s->description,
            'features_text' => $s->features_text,
            'images' => $s->images ?? [],
            'average_rating' => round($s->averageRating(), 1),
            'reviews_count' => $s->reviewCount(),
        ];
    }
}
