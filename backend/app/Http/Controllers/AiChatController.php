<?php

namespace App\Http\Controllers;

use App\Models\AiChatLimit;
use App\Models\AiChatLog;
use App\Models\AiChatSetting;
use App\Models\Area;
use App\Models\Article;
use App\Models\Category;
use App\Models\IndustryKnowledge;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;

class AiChatController extends Controller
{
    // -----------------------------------------------------------------------
    // Tool definitions for Gemini Function Calling
    // -----------------------------------------------------------------------

    private function getToolDeclarations(): array
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

    // -----------------------------------------------------------------------
    // Tool execution
    // -----------------------------------------------------------------------

    private function executeTool(string $name, array $args): array
    {
        return match ($name) {
            'search_stores' => $this->toolSearchStores($args),
            'get_store_detail' => $this->toolGetStoreDetail($args),
            'get_areas' => $this->toolGetAreas(),
            'get_categories' => $this->toolGetCategories(),
            'get_industry_knowledge' => $this->toolGetIndustryKnowledge($args),
            default => ['error' => "Unknown tool: {$name}"],
        };
    }

    private function toolSearchStores(array $args): array
    {
        $query = Store::where('publish_status', 'published');

        if (!empty($args['area'])) {
            $query->where('area', 'ilike', "%{$args['area']}%");
        }
        if (!empty($args['category'])) {
            $query->where('category', 'ilike', "%{$args['category']}%");
        }
        if (!empty($args['min_hourly'])) {
            $query->where('wage->regular->min', '>=', (int)$args['min_hourly']);
        }
        if (!empty($args['max_hourly'])) {
            $query->where('wage->regular->min', '<=', (int)$args['max_hourly']);
        }
        if (!empty($args['nearest_station'])) {
            $query->where('nearest_station', 'ilike', "%{$args['nearest_station']}%");
        }
        if (!empty($args['same_day_trial'])) {
            $query->where('guarantee->same_day_trial', true);
        }
        if (!empty($args['has_guarantee'])) {
            $query->whereNotNull('guarantee->period')->where('guarantee->period', '!=', '');
        }
        if (!empty($args['keyword'])) {
            $keywords = preg_split('/[\s　,、]+/u', trim($args['keyword']));
            $keywords = array_filter($keywords, fn($k) => mb_strlen($k) > 0);
            // OR across keywords: any keyword matching any field is a hit
            // Uses unaccent() for accent-insensitive matching (e.g. Lumière = Lumiere)
            $query->where(function ($q) use ($keywords) {
                foreach ($keywords as $kw) {
                    $q->orWhere(function ($sub) use ($kw) {
                        $sub->whereRaw("unaccent(name) ILIKE unaccent(?)", ["%{$kw}%"])
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
            'popular' => $query->withCount(['reviews' => fn($q) => $q->where('status', 'published')])->orderByDesc('reviews_count'),
            default => $query->orderByDesc('created_at'),
        };

        $limit = min((int)($args['limit'] ?? 5), 10);
        $stores = $query->limit($limit)->get();

        return [
            'count' => $stores->count(),
            'stores' => $stores->map(function ($s) {
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
                    'same_day_trial' => (bool) ($guarantee['same_day_trial'] ?? false),
                    'trial_hourly' => $trial['hourly'] ?? null,
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
            })->values()->toArray(),
        ];
    }

    private function toolGetStoreDetail(array $args): array
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
            'trial_avg_hourly' => $trial['avg_hourly'] ?? null,
            'trial_hourly' => $trial['hourly'] ?? null,
            'same_day_trial' => (bool) ($guarantee['same_day_trial'] ?? false),
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
            'video_url' => $store->video_url,
            'staff_comment' => $store->staff_comment,
            'qa' => $store->qa,
            'average_rating' => round($store->averageRating(), 1),
            'reviews_count' => $store->reviewCount(),
        ];
    }

    private function toolGetAreas(): array
    {
        $areas = Area::orderBy('sort_order')->get(['id', 'name', 'slug']);
        return ['areas' => $areas->toArray()];
    }

    private function toolGetCategories(): array
    {
        $categories = Category::orderBy('sort_order')->get(['id', 'name', 'slug']);
        return ['categories' => $categories->toArray()];
    }

    private function toolGetIndustryKnowledge(array $args): array
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

            // Exact keyword match
            foreach ($keywords as $kw) {
                if (mb_strtolower($kw) === mb_strtolower($topic)) {
                    $score = 100;
                    break;
                }
            }

            // Partial keyword match
            if ($score === 0) {
                foreach ($keywords as $kw) {
                    if (mb_stripos($kw, $topic) !== false || mb_stripos($topic, $kw) !== false) {
                        $score = max($score, 80);
                    }
                }
            }

            // Title match
            if ($score === 0 && mb_stripos($article['title'], $topic) !== false) {
                $score = 60;
            }

            // Content match
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

        // Sort by score descending, return top 3
        usort($matched, fn($a, $b) => $b['score'] - $a['score']);
        $results = array_slice($matched, 0, 3);
        $results = array_map(fn($r) => ['title' => $r['title'], 'category' => $r['category'], 'content' => $r['content']], $results);

        if (empty($results)) {
            return ['articles' => [], 'message' => '該当するナレッジが見つかりませんでした。LINEで担当者にご相談ください。'];
        }

        return ['articles' => $results];
    }

    // -----------------------------------------------------------------------
    // Public endpoints
    // -----------------------------------------------------------------------

    /**
     * Get chat config for a page type (suggest buttons, enabled status).
     */
    public function config(Request $request): JsonResponse
    {
        $pageType = $request->input('page_type', 'top');

        $setting = AiChatSetting::where('page_type', $pageType)->first();

        if (!$setting || !$setting->enabled) {
            return response()->json([
                'enabled' => false,
                'suggest_buttons' => [],
            ]);
        }

        return response()->json([
            'enabled' => true,
            'suggest_buttons' => $setting->suggest_buttons ?? [],
        ]);
    }

    /**
     * Handle chat message — supports agent mode (Function Calling) and
     * fine-tuned mode, selectable via `mode` parameter.
     */
    public function chat(Request $request): JsonResponse
    {
        $request->validate([
            'message' => 'required|string|max:1000',
            'page_type' => 'required|in:top,list,detail',
            'store_id' => 'nullable|integer',
            'history' => 'nullable|array|max:20',
            'mode' => 'nullable|in:agent,finetuned',
            'user_area' => 'nullable|string|max:100',
        ]);

        $ip = $request->ip();
        $pageType = $request->input('page_type');
        $userMessage = $request->input('message');
        $storeId = $request->input('store_id');
        $history = $request->input('history', []);
        $mode = $request->input('mode', 'agent');
        $userArea = $request->input('user_area') ?? '';

        // Resolve authenticated user (optional auth — no middleware required)
        $user = auth('sanctum')->user();

        // --- Usage limit checks ---
        $limitCheck = $this->checkUsageLimits($user, $ip);
        if ($limitCheck) {
            return $limitCheck;
        }

        // Get system prompt
        $setting = AiChatSetting::where('page_type', $pageType)->first();
        if (!$setting || !$setting->enabled) {
            return response()->json([
                'error' => 'チャットは現在無効です。',
            ], 403);
        }

        $apiKey = config('services.gemini.api_key');
        if (!$apiKey) {
            // Dev fallback — mock response when API key is not configured
            \Log::warning('AiChat: GEMINI_API_KEY not set, returning mock response');
            return $this->mockResponse($userMessage, $pageType, $storeId, $mode);
        }

        $startTime = microtime(true);

        $userId = $user?->id;

        try {
            if ($mode === 'finetuned') {
                return $this->handleFinetunedMode($apiKey, $setting, $userMessage, $history, $pageType, $storeId, $ip, $startTime, $userArea, $userId);
            }

            return $this->handleAgentMode($apiKey, $setting, $userMessage, $history, $pageType, $storeId, $ip, $startTime, $userArea, $userId);
        } catch (\Exception $e) {
            \Log::error('AiChat error', ['mode' => $mode, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json([
                'message' => 'ただいま混み合っております。少し時間を置いてから再度お試しください。',
                'stores' => [],
                'follow_ups' => [],
                'meta' => [
                    'mode' => $mode,
                    'model' => 'error',
                    'input_tokens' => 0,
                    'output_tokens' => 0,
                    'total_tokens' => 0,
                    'response_ms' => round((microtime(true) - $startTime) * 1000),
                    'tool_calls' => 0,
                ],
            ]);
        }
    }

    // -----------------------------------------------------------------------
    // Usage limit enforcement
    // -----------------------------------------------------------------------

    private function checkUsageLimits(?object $user, string $ip): ?JsonResponse
    {
        $limits = AiChatLimit::current();
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth();

        // 1. Global daily limit
        $globalToday = AiChatLog::whereDate('created_at', $today)->count();
        if ($globalToday >= $limits->global_daily_limit) {
            return response()->json([
                'message' => $limits->limit_reached_message,
                'limit_type' => 'global_daily',
            ], 429);
        }

        if ($user) {
            // 2. Authenticated user daily limit
            $userToday = AiChatLog::where('user_id', $user->id)
                ->whereDate('created_at', $today)
                ->count();
            if ($userToday >= $limits->user_daily_limit) {
                return response()->json([
                    'message' => $limits->limit_reached_message,
                    'limit_type' => 'user_daily',
                ], 429);
            }

            // 3. Authenticated user monthly limit
            $userMonth = AiChatLog::where('user_id', $user->id)
                ->where('created_at', '>=', $monthStart)
                ->count();
            if ($userMonth >= $limits->user_monthly_limit) {
                return response()->json([
                    'message' => $limits->limit_reached_message,
                    'limit_type' => 'user_monthly',
                ], 429);
            }
        } else {
            // 4. Unauthenticated IP daily limit
            $ipToday = AiChatLog::where('ip_address', $ip)
                ->whereDate('created_at', $today)
                ->count();
            if ($ipToday >= $limits->ip_daily_limit) {
                return response()->json([
                    'message' => $limits->limit_reached_message,
                    'limit_type' => 'ip_daily',
                ], 429);
            }
        }

        return null;
    }

    // -----------------------------------------------------------------------
    // Agent mode: Gemini Function Calling with tool loop
    // -----------------------------------------------------------------------

    private function handleAgentMode(
        string $apiKey,
        AiChatSetting $setting,
        string $userMessage,
        array $history,
        string $pageType,
        ?int $storeId,
        string $ip,
        float $startTime,
        string $userArea = '',
        ?int $userId = null,
    ): JsonResponse {
        $storeContext = $this->buildStoreContext($pageType, $storeId);
        $systemPrompt = $this->buildAgentSystemPrompt($setting, $storeContext, $userArea, $pageType);
        $geminiHistory = $this->buildGeminiHistory($history);

        $contents = [
            ...$geminiHistory,
            [
                'role' => 'user',
                'parts' => [['text' => $userMessage]],
            ],
        ];

        $totalInputTokens = 0;
        $totalOutputTokens = 0;
        $toolCalls = [];
        $maxIterations = 3;

        for ($i = 0; $i < $maxIterations; $i++) {
            $payload = [
                'system_instruction' => [
                    'parts' => [['text' => $systemPrompt]],
                ],
                'contents' => $contents,
                'tools' => [
                    ['functionDeclarations' => $this->getToolDeclarations()],
                ],
                'generationConfig' => [
                    'temperature' => 0.4,
                    'maxOutputTokens' => 2048,
                ],
            ];

            $response = $this->callGeminiWithRetry($apiKey, $payload);

            $data = $response->json();
            $totalInputTokens += $data['usageMetadata']['promptTokenCount'] ?? 0;
            $totalOutputTokens += $data['usageMetadata']['candidatesTokenCount'] ?? 0;

            $candidate = $data['candidates'][0] ?? null;
            if (!$candidate) {
                throw new \Exception('No candidate in response');
            }

            $parts = $candidate['content']['parts'] ?? [];

            // Check for function calls
            $functionCalls = array_filter($parts, fn($p) => isset($p['functionCall']));

            if (empty($functionCalls)) {
                // No function calls — extract text response
                $aiText = collect($parts)
                    ->filter(fn($p) => isset($p['text']))
                    ->pluck('text')
                    ->implode('');

                $elapsed = round((microtime(true) - $startTime) * 1000);

                // Log
                AiChatLog::create([
                    'user_id' => $userId,
                    'ip_address' => $ip,
                    'page_type' => $pageType,
                    'user_message' => $userMessage,
                    'ai_response' => $aiText,
                    'input_tokens' => $totalInputTokens,
                    'output_tokens' => $totalOutputTokens,
                    'mode' => 'agent',
                ]);

                $recommendedStores = $this->extractStoreIdsFromToolCalls($toolCalls, $aiText);
                // Strip [STORE:ID] markers from display text (cards are shown separately)
                $displayText = preg_replace('/\[STORE:\d+\]\s*/', '', $aiText);

                return response()->json([
                    'message' => $displayText,
                    'stores' => $recommendedStores,
                    'follow_ups' => [],
                    'meta' => [
                        'mode' => 'agent',
                        'input_tokens' => $totalInputTokens,
                        'output_tokens' => $totalOutputTokens,
                        'total_tokens' => $totalInputTokens + $totalOutputTokens,
                        'response_ms' => $elapsed,
                        'tool_calls' => count($toolCalls),
                    ],
                ]);
            }

            // Process function calls
            $contents[] = ['role' => 'model', 'parts' => $parts];

            $functionResponseParts = [];
            foreach ($functionCalls as $part) {
                $fc = $part['functionCall'];
                $toolName = $fc['name'];
                $toolArgs = $fc['args'] ?? [];

                $result = $this->executeTool($toolName, $toolArgs);
                $toolCalls[] = [
                    'name' => $toolName,
                    'args' => $toolArgs,
                    'result' => $result,
                ];

                $functionResponseParts[] = [
                    'functionResponse' => [
                        'name' => $toolName,
                        'response' => $result,
                    ],
                ];
            }

            $contents[] = ['role' => 'user', 'parts' => $functionResponseParts];
        }

        // Max iterations reached — return whatever we have
        throw new \Exception('Agent loop exceeded max iterations');
    }

    /**
     * Extract store data from tool call results for inline cards.
     */
    private function extractStoreIdsFromToolCalls(array $toolCalls, string $aiText = ''): array
    {
        $stores = [];
        $seenIds = [];

        foreach ($toolCalls as $call) {
            if ($call['name'] === 'search_stores' && isset($call['result']['stores'])) {
                foreach ($call['result']['stores'] as $s) {
                    if (!in_array($s['id'], $seenIds)) {
                        $seenIds[] = $s['id'];
                        $stores[] = $s;
                    }
                }
            } elseif ($call['name'] === 'get_store_detail' && isset($call['result']['id'])) {
                $s = $call['result'];
                if (!in_array($s['id'], $seenIds)) {
                    $seenIds[] = $s['id'];
                    $stores[] = [
                        'id' => $s['id'],
                        'name' => $s['name'],
                        'area' => $s['area'],
                        'category' => $s['category'] ?? null,
                        'nearest_station' => $s['nearest_station'] ?? null,
                        'hourly_min' => $s['hourly_min'],
                        'hourly_max' => $s['hourly_max'],
                        'feature_tags' => $s['feature_tags'] ?? [],
                        'description' => mb_substr($s['description'] ?? '', 0, 100),
                        'images' => $s['images'] ?? [],
                    ];
                }
            }
        }

        // Prioritize stores mentioned in AI text so cards match the response
        if ($aiText && count($stores) > 1) {
            usort($stores, function ($a, $b) use ($aiText) {
                $aPos = mb_strpos($aiText, $a['name']);
                $bPos = mb_strpos($aiText, $b['name']);
                // Mentioned stores come first, in order of appearance
                if ($aPos === false && $bPos === false) return 0;
                if ($aPos === false) return 1;
                if ($bPos === false) return -1;
                return $aPos <=> $bPos;
            });
        }

        return $stores;
    }

    // -----------------------------------------------------------------------
    // Fine-tuned mode: Simple prompt with tuned model
    // -----------------------------------------------------------------------

    private function handleFinetunedMode(
        string $apiKey,
        AiChatSetting $setting,
        string $userMessage,
        array $history,
        string $pageType,
        ?int $storeId,
        string $ip,
        float $startTime,
        string $userArea = '',
        ?int $userId = null,
    ): JsonResponse {
        // OpenAI Fine-tuned model — read from DB first, fallback to .env
        $openaiKey = trim(config('services.openai.api_key') ?? '');
        $openaiModel = trim($setting->openai_finetuned_model ?? '');

        if (!$openaiKey || !$openaiModel) {
            // Fallback to Gemini prompt-embedding mode if OpenAI not configured
            return $this->handleFinetunedModeFallback(
                $apiKey, $setting, $userMessage, $history,
                $pageType, $storeId, $ip, $startTime, $userArea, $userId
            );
        }

        $storeContext = $this->buildStoreContext($pageType, $storeId);
        $systemPrompt = $this->buildOpenAiSystemPrompt($setting, $storeContext, $userArea, $pageType);

        // Build OpenAI messages array
        $messages = [['role' => 'system', 'content' => $systemPrompt]];
        foreach ($history as $msg) {
            $role = ($msg['role'] ?? '') === 'user' ? 'user' : 'assistant';
            $messages[] = ['role' => $role, 'content' => $msg['content'] ?? ''];
        }
        $messages[] = ['role' => 'user', 'content' => $userMessage];

        $response = Http::timeout(30)
            ->withHeaders([
                'Authorization' => "Bearer {$openaiKey}",
                'Content-Type' => 'application/json',
            ])
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => $openaiModel,
                'messages' => $messages,
                'temperature' => 0.4,
                'max_tokens' => 2048,
            ]);

        if (!$response->successful()) {
            throw new \Exception('OpenAI API error: ' . $response->status() . ' ' . $response->body());
        }

        $data = $response->json();
        $aiText = $data['choices'][0]['message']['content'] ?? '';
        $inputTokens = $data['usage']['prompt_tokens'] ?? 0;
        $outputTokens = $data['usage']['completion_tokens'] ?? 0;
        $elapsed = round((microtime(true) - $startTime) * 1000);

        // Log
        AiChatLog::create([
            'user_id' => $userId,
            'ip_address' => $ip,
            'page_type' => $pageType,
            'user_message' => $userMessage,
            'ai_response' => $aiText,
            'input_tokens' => $inputTokens,
            'output_tokens' => $outputTokens,
            'mode' => 'finetuned',
        ]);

        $recommendedStores = $this->extractStoreRecommendations($aiText);
        $displayText = preg_replace('/\[STORE:\d+\]\s*/', '', $aiText);

        return response()->json([
            'message' => $displayText,
            'stores' => $recommendedStores,
            'follow_ups' => [],
            'meta' => [
                'mode' => 'finetuned',
                'model' => $openaiModel,
                'input_tokens' => $inputTokens,
                'output_tokens' => $outputTokens,
                'total_tokens' => $inputTokens + $outputTokens,
                'response_ms' => $elapsed,
                'tool_calls' => 0,
            ],
        ]);
    }

    /**
     * Fallback: Gemini prompt-embedding mode (when OpenAI not configured)
     */
    private function handleFinetunedModeFallback(
        string $apiKey,
        AiChatSetting $setting,
        string $userMessage,
        array $history,
        string $pageType,
        ?int $storeId,
        string $ip,
        float $startTime,
        string $userArea = '',
        ?int $userId = null,
    ): JsonResponse {
        $storeContext = $this->buildStoreContext($pageType, $storeId);
        $systemPrompt = $this->buildSystemPrompt($setting, $storeContext, $userArea, $pageType);
        $geminiHistory = $this->buildGeminiHistory($history);

        $model = 'gemini-3.1-flash-lite-preview';
        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

        $payload = [
            'contents' => [
                ...$geminiHistory,
                ['role' => 'user', 'parts' => [['text' => $userMessage]]],
            ],
            'system_instruction' => ['parts' => [['text' => $systemPrompt]]],
            'generationConfig' => [
                'temperature' => 0.5,
                'maxOutputTokens' => 2048,
            ],
        ];

        $response = $this->callGeminiWithRetry($apiKey, $payload);

        $data = $response->json();
        $aiText = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
        $inputTokens = $data['usageMetadata']['promptTokenCount'] ?? 0;
        $outputTokens = $data['usageMetadata']['candidatesTokenCount'] ?? 0;
        $elapsed = round((microtime(true) - $startTime) * 1000);

        AiChatLog::create([
            'user_id' => $userId,
            'ip_address' => $ip,
            'page_type' => $pageType,
            'user_message' => $userMessage,
            'ai_response' => $aiText,
            'input_tokens' => $inputTokens,
            'output_tokens' => $outputTokens,
            'mode' => 'finetuned',
        ]);

        $recommendedStores = $this->extractStoreRecommendations($aiText);
        $displayText = preg_replace('/\[STORE:\d+\]\s*/', '', $aiText);

        return response()->json([
            'message' => $displayText,
            'stores' => $recommendedStores,
            'follow_ups' => [],
            'meta' => [
                'mode' => 'finetuned',
                'model' => $model,
                'input_tokens' => $inputTokens,
                'output_tokens' => $outputTokens,
                'total_tokens' => $inputTokens + $outputTokens,
                'response_ms' => $elapsed,
                'tool_calls' => 0,
            ],
        ]);
    }

    /**
     * System prompt for OpenAI fine-tuned model.
     * FT model has tone/format/domain knowledge baked in via fine-tuning.
     * Runtime injects only: store data, page context, area, operator instructions.
     * Does NOT repeat detailed behavior rules (redundant for FT model).
     */
    private function buildOpenAiSystemPrompt(AiChatSetting $setting, string $storeContext, string $userArea = '', string $pageType = 'top'): string
    {
        $storeData = $storeContext ?: $this->buildPipeDelimitedStoreData();

        $prompt = "【掲載店舗データ】\n{$storeData}\n\n";

        if ($userArea) {
            $prompt .= "【ユーザーの現在地】{$userArea}付近。エリア指定がない場合はこの地域周辺を優先。\n\n";
        }

        if ($pageType === 'detail' && $storeContext) {
            $prompt .= "【詳細ページ】上記の店舗に関する質問に回答する。他店舗は紹介しない。\n\n";
        }

        if ($setting->system_prompt) {
            $prompt .= "【運営からの追加指示】\n{$setting->system_prompt}\n\n";
        }

        // Remind FT model of the one runtime-critical format requirement
        $prompt .= "店舗を紹介する時は必ず[STORE:ID]マーカーを付けること。LINE誘導CTAを回答の末尾に必ず付けること。";

        return $prompt;
    }

    /**
     * Core system prompt shared by all AI modes (Agent, FT, Gemini fallback).
     * FT model has tone/format/domain baked in, but these rules ensure consistent behavior.
     */
    private function buildCoreSystemPrompt(AiChatSetting $setting, string $storeContext, string $userArea = '', string $pageType = 'top'): string
    {
        $toneDesc = $this->getToneDescription($setting->tone);

        $storeData = $storeContext ?: $this->buildPipeDelimitedStoreData();

        $prompt = "【ペルソナ】\n" .
            "あなたは「Recta AI（採用アシスタントAI）」です。ナイトワーク業界（キャバクラ・ラウンジ・ガールズバー・コンカフェ・クラブ）の求人に詳しい、フレンドリーなキャリアアドバイザーです。" .
            "求人マッチングプラットフォーム「Recta」の公式AIアシスタントとして、求職者の不安を解消し、最適なお店選びをサポートします。\n" .
            "口調: {$toneDesc}\n" .
            "一人称は使わない。「おすすめは〜」「ご紹介します」のような表現を使う。\n\n";

        if ($setting->system_prompt) {
            $prompt .= "【運営からの追加指示】\n{$setting->system_prompt}\n\n";
        }

        if ($userArea) {
            $prompt .= "【ユーザーの現在地】{$userArea}付近にいます。エリア指定がない質問の場合、この地域周辺のお店を優先的に紹介してください。\n\n";
        }

        if ($pageType === 'detail' && $storeContext) {
            $prompt .= "【店舗詳細ページ（最優先）】\n" .
                "ユーザーは閲覧中の店舗の詳細ページにいます。質問はすべてこの店舗に関するものとして回答すること。\n" .
                "この店舗のデータのみを使って回答する。他の店舗を紹介しない。\n\n";
        }

        $prompt .= "【掲載店舗データ】\n{$storeData}\n\n";

        $prompt .=
            "【店舗データのカラム定義】\n" .
            "パイプ区切り（|）で各店舗の情報が並んでいます。カラムの意味:\n" .
            "- ID: 店舗ID（[STORE:ID]マーカーに使用）\n" .
            "- 店名/エリア/最寄り駅/カテゴリ: 基本情報\n" .
            "- 時給MIN/時給MAX: 時給範囲（円）。「高時給」「稼ぎたい」→ 時給MAXが高い店を優先\n" .
            "- 開始時刻/終了時刻: 営業時間。「○時まで働きたい」→ 終了時刻が条件を満たす店のみ紹介。LASTは閉店時刻不定（深夜対応）\n" .
            "- 日払い体系: 給与支払い方法（全額日払い/日払い可/月2回等）。「日払い」→ 全額日払いか日払い可の店\n" .
            "- 体入: 体入の可否と時給（当日OK/体入○○円等）\n" .
            "- 保証: 保証期間（1ヶ月/3ヶ月等）。「安心して始めたい」→ 保証ありの店を優先\n" .
            "- ノルマ: ノルマの有無・内容。「ノルマなし」→ 「ノルマなし」記載の店\n" .
            "- ランク: S/A/B/C（内部評価、回答では言及しない）\n" .
            "- わいわい度: 0-100。高いほど賑やか・アットホーム。「わいわい系」→ 70以上を優先\n" .
            "- ゆるさ度: 0-100。高いほどプレッシャーなし・自由。「ゆるく働きたい」→ 70以上を優先\n" .
            "- ドレスコード: 服装規定（ドレス貸出あり/服装自由等）。服装の質問に直接回答できる\n" .
            "- 送り: 送りの距離・有無。「送りあり？」→ この欄を確認して回答\n" .
            "- 特徴タグ: カンマ区切りのタグ\n" .
            "- 説明: 店舗の特徴テキスト（先頭80文字）\n\n" .

            "【店舗データの参照方法】\n" .
            "- 店舗を紹介する時は、必ず[STORE:ID]マーカーを店名の直前に付ける\n" .
            "- 例: [STORE:12] Club Lumière（六本木/六本木駅）時給5,000円〜\n" .
            "- マーカーがあると、ユーザーの画面に店舗カードが自動表示される\n" .
            "- 1回の回答で2〜3店舗を紹介する（5件以上の羅列はNG）\n" .
            "- 店舗データに載っていないお店は紹介してはいけない\n\n" .

            "【4ブロック回答構成（店舗紹介時）】\n" .
            "①ユーザーの状況に共感する1文（例: 「未経験でも安心して始められるお店、探してみました！」）\n" .
            "②店舗カード（2〜3件、[STORE:ID]マーカー付き）\n" .
            "③比較ポイントor選び方のヒント（「体入で雰囲気を確かめるのがおすすめです」等）\n" .
            "④LINE誘導CTA（必須、最後に必ず付ける）\n\n" .

            "【LINE誘導（必須）】\n" .
            "回答の最後に必ず改行2つの後に以下を付ける（省略禁止）:\n" .
            "もっと詳しく知りたい方は、LINEで担当者に直接相談できます！\n\n" .
            "LINE誘導の価値として以下を必要に応じて言及する:\n" .
            "- 時給・待遇の確定スカウト（面接前に時給・日払い条件を確定交渉できる）\n" .
            "- スタッフ同行体入（初回体入にスタッフが同席・サポートできる）\n" .
            "- 内部情報・非公開求人（Rectaに未掲載の優良店も紹介可能）\n\n" .

            "【絶対ルール（禁止事項）】\n" .
            "1. ユーザーに質問を返してはいけない。「どのエリアですか？」「どんな条件ですか？」等は禁止。条件が曖昧でも推測して店舗データから選ぶ\n" .
            "2. 必ず店舗データから2〜3件を紹介する。データにない店舗を紹介してはいけない\n" .
            "3. 絵文字は使わない\n" .
            "4. 日本語のみで回答する\n" .
            "5. 風俗店・デリヘル・ソープ等の性的サービスを伴う店舗は紹介しない。ただし風俗店で働いていると言うユーザーへの転向相談には応じる\n" .
            "6. 未成年（18歳未満）の就労を案内しない。年齢確認が必要なケースでは「18歳以上が対象です」と明記する\n" .
            "7. 枕営業・性的サービスへの誘導と受け取られる回答は禁止\n\n" .

            "【給与・待遇に関する詳細ルール】\n" .
            "- 時給は必ず「○,○○○円〜」の形式で表示（確定値のように書かない）\n" .
            "- バック率・日給は「目安」「実績による」等の注釈を付ける\n" .
            "- 保証期間がある場合は積極的に言及する（安心材料になる）\n" .
            "- 体入の有無と体入時給も重要情報として紹介する\n" .
            "- 還元率の質問: バック率は店舗により25〜50%と幅広い。具体的な確定額はLINE相談を促す\n" .
            "- 保証の質問: 保証期間・保証額は店舗ごとに異なる。データにある情報のみ伝え、詳細はLINE相談\n\n" .

            "【よくある質問への対応ルール】\n" .
            "- 出勤調整: 「シフトの自由度が高いお店も多く、週1〜2日から始めた方も多いです。お店ごとに違うのでLINEで相談するのがおすすめです」\n" .
            "- 面接・体入の服装: 「清潔感があれば普段着でOKなお店がほとんど。体入時はお店のドレスコードに合わせて」。詳細はLINE誘導\n" .
            "- 矯正中・ピアス・タトゥー: 「お店によって対応が異なります。非公開情報もあるのでLINEで確認するのがスムーズです」\n" .
            "- 新店舗: 「オープン直後はルール・スタッフが変わりやすい。体入で確認してから決めるのがベター」\n" .
            "- 移籍時期: 「在籍中のお店との契約・同伴状況を確認してから動くのが安全。詳しくはLINEで」\n" .
            "- 週◯日の出勤: 「週1〜週5まで幅広く対応可能なお店があります。希望条件をLINEで伝えれば合うお店を探します」\n" .
            "- 身分証: 「年齢確認のため、体入・入店時には身分証（マイナンバーカード/免許証/保険証）が必要です」\n" .
            "- 風俗転向（キャバクラ等への転職相談）: 「キャバクラ・ラウンジへの転向は珍しくないです。まずは体入で雰囲気を確かめてみては」。詳細な過去職歴は聞かない\n" .
            "- スペック・外見の不安: 「ルックスより雰囲気・明るさ・清潔感を重視する店が多いです。未経験でも活躍している方がたくさんいます」\n\n" .

            "【雰囲気・ニュアンスの解釈】\n" .
            "ユーザーが曖昧な表現を使った場合、店舗の説明文・特徴から雰囲気を読み取って最適な店舗を選ぶ:\n" .
            "- 「わいわい系」「にぎやか」「楽しい」→ アットホーム、明るい雰囲気、スタッフ同士の仲が良い等\n" .
            "- 「落ち着いた」「大人っぽい」「上品」→ 高級、会員制、落ち着いた雰囲気等\n" .
            "- 「ゆるい」「気楽」「プレッシャーなし」→ ノルマなし、自由シフト、未経験歓迎等\n" .
            "- 「稼ぎたい」「ガッツリ」→ 高時給、バック充実、経験者優遇等\n" .
            "- 「初めて」「不安」→ 未経験歓迎、研修充実、アットホーム等\n\n" .

            "【ナイトワーク以外の質問】\n" .
            "「申し訳ありませんが、Recta AIはナイトワーク求人の相談専門です。お仕事探しについてお気軽にご質問ください！」と返す\n\n" .

            "【センシティブ・法令関連】\n" .
            "- 違法行為・風営法違反に関する質問には応じない\n" .
            "- 「詳しくはLINEで担当者にご相談ください」と誘導する\n" .
            "- 個人情報（本名・住所・学校名等）をユーザーから聞き出すことは禁止。必要情報はLINE面談で収集\n\n" .

            "【回答の長さ・フォーマット】\n" .
            "- 店舗紹介は1店舗あたり1〜2行で簡潔に\n" .
            "- 全体で300〜500文字程度が目安\n" .
            "- 各店舗は以下の形式で紹介:\n" .
            "  ・[STORE:ID] 店名（エリア/最寄り駅）時給○,○○○円〜\n" .
            "    [1行で特徴やおすすめポイント]\n\n" .

            "【回答例】\n" .
            "ユーザー: 未経験で働けるお店ある？\n\n" .
            "回答: 未経験でも安心して始められるお店を探してみました！\n\n" .
            "・[STORE:5] Lounge Étoile（六本木/六本木駅）時給4,000円〜\n" .
            "  研修制度が充実していて未経験でも安心。保証期間もあります\n\n" .
            "・[STORE:8] Lounge Brilliance（銀座/銀座駅）時給3,500円〜\n" .
            "  ノルマなしで気楽に働ける環境。当日体入OK・全額日払いです\n\n" .
            "体入で雰囲気を確かめてから決めるのがおすすめです！\n\n" .
            "もっと詳しく知りたい方は、LINEで担当者に直接相談できます！\n\n" .

            "【NG例（絶対に避ける）】\n" .
            "「どのエリアがご希望ですか？」← 質問返しは禁止\n" .
            "[STORE:ID]マーカーなしで店舗を紹介する ← 禁止\n" .
            "LINE誘導CTAを省略する ← 禁止";

        return $prompt;
    }

    /**
     * Build pipe-delimited store data for FT runtime system prompt.
     * Format: ID|店名|エリア|カテゴリ|時給MIN|時給MAX|特徴タグ|説明|...
     * Token-efficient alternative to JSON for frequently-changing store data.
     */
    private function buildPipeDelimitedStoreData(): string
    {
        return Cache::remember('public_stores_pipe_v3', 600, function () {
            $stores = Store::where('publish_status', 'published')->get();

            // カラム説明（AIへの参照用ヘッダー）
            // ID|店名|エリア|最寄り駅|カテゴリ|時給MIN|時給MAX|開始時刻|終了時刻|日払い体系|体入|保証|ノルマ|ランク|わいわい度|ゆるさ度|ドレスコード|送り|特徴タグ|説明
            $header = "ID|店名|エリア|最寄り駅|カテゴリ|時給MIN|時給MAX|開始時刻|終了時刻|日払い体系|体入|保証|ノルマ|ランク|わいわい度|ゆるさ度|ドレスコード|送り|特徴タグ|説明";
            $lines = [$header];

            foreach ($stores as $s) {
                $schedule    = is_array($s->schedule)     ? $s->schedule     : [];
                $wage        = is_array($s->wage)         ? $s->wage         : [];
                $guarantee   = is_array($s->guarantee)    ? $s->guarantee    : [];
                $castProfile = is_array($s->cast_profile) ? $s->cast_profile : [];
                $dressCodeArr= is_array($s->dress_code)   ? $s->dress_code   : [];
                $regular     = $wage['regular'] ?? [];
                $trialArr    = $wage['trial']   ?? [];
                $payrollArr  = $wage['payroll'] ?? [];

                $tags = implode(',', $s->feature_tags ?? []);
                $payroll = $payrollArr['type'] ?? '';
                $trialHourly = $trialArr['hourly'] ?? '';
                $sameDay = (bool) ($guarantee['same_day_trial'] ?? false);
                $trial = $sameDay ? "当日OK({$trialHourly})" : ($trialHourly ? "体入{$trialHourly}" : '');
                $guaranteeStr = $guarantee['period'] ?? '';
                $norma = mb_substr(str_replace('|', '/', $guarantee['norma'] ?? ''), 0, 30);
                $rank = $s->rank ?? '';
                $waiwai = $castProfile['waiwai'] ?? '';
                $loose  = $castProfile['loose']  ?? '';
                $dressCodeStr = mb_substr(
                    str_replace(['|', "\n"], ['/', ' '], $dressCodeArr['description'] ?? ''),
                    0, 30
                );
                $transfer = $s->transfer_km ? "送り{$s->transfer_km}" : ($s->transfer_description ? '送りあり' : '');
                $desc = mb_substr(str_replace(['|', "\n"], ['/', ' '], $s->description ?? ''), 0, 80);

                $lines[] = implode('|', [
                    $s->id,
                    $s->name,
                    $s->area,
                    $s->nearest_station ?? '',
                    $s->category ?? '',
                    $regular['min'] ?? '',
                    $regular['max'] ?? '',
                    $schedule['open']  ?? '',
                    $schedule['close'] ?? '',
                    $payroll,
                    $trial,
                    $guaranteeStr,
                    $norma,
                    $rank,
                    $waiwai,
                    $loose,
                    $dressCodeStr,
                    $transfer,
                    $tags,
                    $desc,
                ]);
            }

            return implode("\n", $lines);
        });
    }

    // -----------------------------------------------------------------------
    // Prompt builders
    // -----------------------------------------------------------------------

    private function buildStoreContext(string $pageType, ?int $storeId): string
    {
        if ($pageType === 'detail' && $storeId) {
            $store = Store::find($storeId);
            if ($store) {
                $schedule    = is_array($store->schedule)     ? $store->schedule     : [];
                $wage        = is_array($store->wage)         ? $store->wage         : [];
                $compensation= is_array($store->compensation) ? $store->compensation : [];
                $guarantee   = is_array($store->guarantee)    ? $store->guarantee    : [];
                $regular     = $wage['regular'] ?? [];
                $trial       = $wage['trial']   ?? [];

                $hourlyMin = $regular['min'] ?? '';
                $hourlyMax = $regular['max'] ?? '';
                $businessHours = $schedule['hours_text'] ?? '';
                $holidays = $schedule['holidays'] ?? '';
                $dailyEstimate = $wage['daily_estimate'] ?? null;
                $norma = $guarantee['norma'] ?? null;
                $guaranteePeriod = $guarantee['period'] ?? null;
                $guaranteeDetails = $guarantee['details'] ?? '';
                $sameDayTrial = (bool) ($guarantee['same_day_trial'] ?? false);
                $trialHourly = $trial['hourly'] ?? '';

                $tags = implode(', ', $store->feature_tags ?? []);
                $backs = collect($compensation['back'] ?? [])
                    ->map(fn($b) => ($b['label'] ?? '') . ':' . ($b['amount'] ?? ''))
                    ->filter(fn($b) => $b !== ':')
                    ->implode(', ');

                $context = "【現在閲覧中の店舗】\n" .
                    "店名: {$store->name}\n" .
                    "エリア: {$store->area}（{$store->nearest_station}）\n" .
                    "カテゴリ: {$store->category}\n" .
                    "時給: {$hourlyMin}〜{$hourlyMax}円\n" .
                    "営業時間: {$businessHours}\n" .
                    "定休日: {$holidays}\n";

                if ($dailyEstimate) $context .= "日給目安: {$dailyEstimate}\n";
                if ($backs) $context .= "バック: {$backs}\n";
                if ($norma) $context .= "ノルマ: {$norma}\n";
                if ($guaranteePeriod) $context .= "保証: {$guaranteePeriod} {$guaranteeDetails}\n";
                if ($sameDayTrial) $context .= "当日体入: OK（体入時給: {$trialHourly}）\n";
                if ($tags) $context .= "特徴: {$tags}\n";
                $context .= "説明: {$store->description}\n";
                if ($store->features_text) $context .= "詳細特徴: {$store->features_text}\n";

                return $context;
            }
        }

        return '';
    }

    /**
     * Agent mode system prompt — lean and tool-first.
     * Does NOT include full store pipe data (tools fetch fresh data from DB).
     * Only includes persona, page context, behavior rules, and tool usage instructions.
     */
    private function buildAgentSystemPrompt(AiChatSetting $setting, string $storeContext, string $userArea = '', string $pageType = 'top'): string
    {
        $toneDesc = $this->getToneDescription($setting->tone);

        $prompt = "【ペルソナ】\n" .
            "あなたは「Recta AI（採用アシスタントAI）」です。ナイトワーク業界（キャバクラ・ラウンジ・ガールズバー・コンカフェ・クラブ）の求人に詳しい、フレンドリーなキャリアアドバイザーです。\n" .
            "口調: {$toneDesc}\n" .
            "一人称は使わない。絵文字は使わない。日本語のみで回答する。\n\n";

        if ($setting->system_prompt) {
            $prompt .= "【運営からの追加指示】\n{$setting->system_prompt}\n\n";
        }

        if ($userArea) {
            $prompt .= "【ユーザーの現在地】{$userArea}付近。エリア指定がない場合はこの地域周辺を優先。\n\n";
        }

        // Detail page: store data injected directly, no search needed
        if ($pageType === 'detail' && $storeContext) {
            $prompt .= "{$storeContext}\n\n";
            $prompt .=
                "【詳細ページのルール】\n" .
                "- この店舗に関する質問に直接回答する。他店舗を検索・紹介しない\n" .
                "- 業界用語の質問（体入・ノルマ・バック等）にはget_industry_knowledgeを呼び出す\n" .
                "- 店舗データに記載のない情報は「詳しくはLINEで担当者にご確認ください」と案内する\n\n";
        } else {
            // Top/list page: always use search tools
            $prompt .=
                "【ページ種別】" . ($pageType === 'list' ? "店舗一覧ページ（ユーザーは既に検索中）\n\n" : "トップページ\n\n") .
                "【ツール使用ルール（必須）】\n" .
                "必ずsearch_storesを呼び出してDBの実データから回答する。知識だけで店舗を紹介してはいけない。\n\n" .
                "【クエリ変換ガイド】\n" .
                "- 「初めて」「初心者」「未経験」→ tags: [\"未経験歓迎\"]\n" .
                "- 「稼ぎたい」「高収入」「高時給」→ sort: \"hourly_desc\"\n" .
                "- 「体入」「体験入店」→ same_day_trial: true\n" .
                "- 「ゆるい」「ノルマない」「プレッシャーなし」→ tags: [\"ノルマなし\"]\n" .
                "- 「送りあり」「終電後」→ tags: [\"送りあり\"] または [\"終電上がりOK\"]\n" .
                "- 「日払い」「全額日払い」→ tags: [\"日払いあり\"]\n" .
                "- 「わいわい」「にぎやか」「アットホーム」→ keyword: \"アットホーム\"\n" .
                "- 「落ち着いた」「大人っぽい」「上品」→ keyword: \"落ち着い\"\n" .
                "- 「高級」「会員制」→ keyword: \"会員制\"\n" .
                "- 「○時まで」「朝まで」「深夜」→ 検索後に closing_time を確認し条件を満たす店のみ紹介。タグだけで判断しない\n" .
                "- 「週1」「副業」「Wワーク」→ tags: [\"週1OK\"] または [\"Wワーク歓迎\"]\n" .
                "- エリア不明+現在地あり → 現在地周辺のエリアで検索\n" .
                "- 0件の場合は条件を緩めて再検索し「条件を少し広げて探しました」と添える\n" .
                "- 業界用語の質問（バック・体入・ノルマ・税金・キャバクラとラウンジの違い等）→ get_industry_knowledge\n\n";
        }

        $prompt .=
            "【回答フォーマット（店舗紹介時）】\n" .
            "①共感の1文（「未経験でも安心して始められるお店を探してみました！」等）\n" .
            "②店舗カード 2〜3件（必ず[STORE:ID]マーカー付き）\n" .
            "  ・[STORE:ID] 店名（エリア/最寄り駅）時給○,○○○円〜\n" .
            "   [特徴1行]\n" .
            "③選び方のヒント（「体入で雰囲気を確かめてから決めるのがおすすめです」等）\n" .
            "④LINE誘導（必須・省略禁止）: もっと詳しく知りたい方は、LINEで担当者に直接相談できます！\n\n" .

            "【禁止事項】\n" .
            "- ユーザーへの質問返し（「どのエリアですか？」等）は禁止。条件が曖昧でも推測して回答\n" .
            "- [STORE:ID]マーカーなしで店舗を紹介することは禁止\n" .
            "- LINE誘導CTAの省略は禁止\n" .
            "- 未成年（18歳未満）の就労を案内しない\n" .
            "- 風俗・デリヘル等の性的サービス店の紹介は禁止\n\n" .

            "【給与の表現】\n" .
            "- 時給は「○,○○○円〜」の形式。確定値のように書かない\n" .
            "- バック率・日給は「目安」と添える\n" .
            "- 保証期間がある場合は積極的に言及する（安心材料）\n";

        return $prompt;
    }

    private function buildSystemPrompt(AiChatSetting $setting, string $storeContext, string $userArea = '', string $pageType = 'top'): string
    {
        return $this->buildCoreSystemPrompt($setting, $storeContext, $userArea, $pageType);
    }

    /**
     * Call Gemini API with a single retry on 503 (high demand).
     */
    private function callGeminiWithRetry(string $apiKey, array $payload): \Illuminate\Http\Client\Response
    {
        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key={$apiKey}";

        $response = Http::timeout(30)->post($endpoint, $payload);

        if ($response->status() === 503) {
            \Log::warning('Gemini API 503, retrying in 2s...');
            usleep(2_000_000); // 2 seconds
            $response = Http::timeout(30)->post($endpoint, $payload);
        }

        if (!$response->successful()) {
            \Log::error('Gemini API error', ['status' => $response->status(), 'body' => substr($response->body(), 0, 1000)]);
            throw new \Exception('Gemini API error: ' . $response->status());
        }

        return $response;
    }

    private function getToneDescription(string $tone): string
    {
        return match ($tone) {
            'casual' => 'カジュアルで親しみやすい口調',
            'formal' => '丁寧でフォーマルな口調',
            default => 'フレンドリーで温かみのある口調',
        };
    }

    private function buildGeminiHistory(array $history): array
    {
        $geminiHistory = [];
        foreach ($history as $msg) {
            $role = ($msg['role'] ?? '') === 'user' ? 'user' : 'model';
            $text = $msg['content'] ?? $msg['text'] ?? '';
            if ($text) {
                $geminiHistory[] = [
                    'role' => $role,
                    'parts' => [['text' => $text]],
                ];
            }
        }
        return $geminiHistory;
    }

    private function extractStoreRecommendations(string $text): array
    {
        // Try [STORE:ID] markers first
        preg_match_all('/\[STORE:(\d+)\]/', $text, $matches);
        if (!empty($matches[1])) {
            $ids = array_unique($matches[1]);
            return Store::whereIn('id', $ids)
                ->where('publish_status', 'published')
                ->get()
                ->map(fn($s) => $this->storeToCard($s))
                ->values()
                ->toArray();
        }

        // Fallback: match store names in text (for FT mode where markers may be missing)
        $stores = Store::where('publish_status', 'published')->get();
        $matched = $stores->filter(fn($s) => str_contains($text, $s->name));

        if ($matched->isNotEmpty()) {
            return $matched->take(5)
                ->map(fn($s) => $this->storeToCard($s))
                ->values()
                ->toArray();
        }

        return [];
    }

    private function storeToCard(Store $s): array
    {
        $wage    = is_array($s->wage) ? $s->wage : [];
        $regular = $wage['regular'] ?? [];

        return [
            'id' => $s->id,
            'name' => $s->name,
            'area' => $s->area,
            'category' => $s->category,
            'nearest_station' => $s->nearest_station,
            'hourly_min' => $regular['min'] ?? null,
            'hourly_max' => $regular['max'] ?? null,
            'description' => $s->description,
            'feature_tags' => $s->feature_tags,
            'images' => $s->images,
            'average_rating' => round($s->averageRating(), 1),
        ];
    }

    /**
     * Fallback response when Gemini API key is not configured.
     */
    private function mockResponse(string $message, string $pageType, ?int $storeId, string $mode, ?int $userId = null): JsonResponse
    {
        $startTime = microtime(true);

        // Try to match stores based on user's query keywords
        $query = Store::where('publish_status', 'published');

        // Keyword-based filtering for more relevant results
        if (str_contains($message, '未経験')) {
            $query->whereJsonContains('feature_tags', '未経験歓迎');
        }
        if (str_contains($message, 'ノルマ')) {
            $query->whereJsonContains('feature_tags', 'ノルマなし');
        }
        if (str_contains($message, '日払い')) {
            $query->whereJsonContains('feature_tags', '日払いOK');
        }
        if (str_contains($message, '時給') || str_contains($message, '高時給') || str_contains($message, 'バック') || str_contains($message, '給料')) {
            $query->orderBy('wage->regular->max', 'desc');
        }

        // Area keywords
        foreach (['六本木', '銀座', '新宿', '渋谷', '歌舞伎町', '池袋'] as $area) {
            if (str_contains($message, $area)) {
                $query->where('area', 'ilike', "%{$area}%");
                break;
            }
        }

        // Category keywords
        if (str_contains($message, 'キャバ')) {
            $query->where('category', 'ilike', '%キャバ%');
        } elseif (str_contains($message, 'ラウンジ')) {
            $query->where('category', 'ilike', '%ラウンジ%');
        } elseif (str_contains($message, 'クラブ')) {
            $query->where('category', 'ilike', '%クラブ%');
        } elseif (str_contains($message, 'ガールズバー') || str_contains($message, 'ガルバ')) {
            $query->where('category', 'ilike', '%ガールズバー%');
        }

        $stores = $query->limit(3)->get();

        // Fallback: if filtered query returned 0 results, get any 3
        if ($stores->isEmpty()) {
            $stores = Store::where('publish_status', 'published')->limit(3)->get();
        }

        $storeCards = $stores->map(function ($s) {
            $wage    = is_array($s->wage) ? $s->wage : [];
            $regular = $wage['regular'] ?? [];
            return [
                'id' => $s->id,
                'name' => $s->name,
                'area' => $s->area,
                'category' => $s->category,
                'nearest_station' => $s->nearest_station,
                'hourly_min' => $regular['min'] ?? null,
                'hourly_max' => $regular['max'] ?? null,
                'feature_tags' => $s->feature_tags,
                'description' => mb_substr($s->description ?? '', 0, 100),
                'images' => $s->images,
                'average_rating' => round($s->averageRating(), 1),
            ];
        })->values()->toArray();

        $lineCta = "\n\nもっと詳しく知りたい方は、LINEで担当者に直接相談できます！";

        // Build response with actual store names and details
        $storeList = $stores->map(function ($s) {
            $wage      = is_array($s->wage) ? $s->wage : [];
            $regular   = $wage['regular'] ?? [];
            $guarantee = is_array($s->guarantee) ? $s->guarantee : [];
            $hourlyMin = (int) ($regular['min'] ?? 0);
            $hourlyMax = (int) ($regular['max'] ?? 0);

            $line = "・{$s->name}（{$s->area}/{$s->nearest_station}）時給" . number_format($hourlyMin) . "〜" . number_format($hourlyMax) . "円";
            $features = [];
            if (!empty($guarantee['same_day_trial'])) $features[] = '当日体入OK';
            if (!empty($guarantee['period'])) $features[] = '保証あり';
            $tags = $s->feature_tags ?? [];
            if (in_array('未経験歓迎', $tags)) $features[] = '未経験歓迎';
            if (in_array('ノルマなし', $tags)) $features[] = 'ノルマなし';
            if (in_array('日払いあり', $tags) || in_array('日払いOK', $tags)) $features[] = '日払い対応';
            if ($features) $line .= "\n  " . implode('・', array_slice($features, 0, 3));
            return $line;
        })->implode("\n\n");

        if (str_contains($message, '未経験')) {
            $response = "未経験歓迎のお店をご紹介します！\n\n{$storeList}\n\nどのお店も研修制度が充実していて、初めての方でも安心してスタートできます。{$lineCta}";
        } elseif (str_contains($message, '時給') || str_contains($message, '給料') || str_contains($message, 'バック') || str_contains($message, '高時給')) {
            $response = "高時給のお店をピックアップしました！\n\n{$storeList}\n\nバック率や実際の日給目安など、詳しくはLINEでお気軽にご相談ください。{$lineCta}";
        } elseif (str_contains($message, 'ノルマ')) {
            $response = "ノルマなしで働けるお店をご紹介します！\n\n{$storeList}\n\nプレッシャーなく、自分のペースで働ける環境が整っています。{$lineCta}";
        } elseif (str_contains($message, '体入') || str_contains($message, '体験入店')) {
            $response = "体験入店できるお店をご紹介します！\n\n{$storeList}\n\n当日体入OKのお店なら、思い立ったらすぐ体験できます。{$lineCta}";
        } elseif (str_contains($message, '保証')) {
            $response = "保証制度があるお店をご紹介します！\n\n{$storeList}\n\n保証期間中は安定した収入が確保できるので、安心してスタートできます。{$lineCta}";
        } else {
            $response = "条件に合いそうなお店をご紹介します！\n\n{$storeList}{$lineCta}";
        }

        $elapsed = round((microtime(true) - $startTime) * 1000);

        AiChatLog::create([
            'user_id' => $userId,
            'ip_address' => request()->ip(),
            'page_type' => $pageType,
            'user_message' => $message,
            'ai_response' => $response,
            'input_tokens' => 0,
            'output_tokens' => 0,
            'mode' => $mode,
        ]);

        return response()->json([
            'message' => $response,
            'stores' => $storeCards,
            'follow_ups' => [],
            'meta' => [
                'mode' => $mode,
                'model' => 'mock',
                'input_tokens' => 0,
                'output_tokens' => 0,
                'total_tokens' => 0,
                'response_ms' => $elapsed,
                'tool_calls' => 0,
            ],
        ]);
    }

    private function generateFollowUps(string $pageType, string $userMessage, string $aiResponse = '', array $toolCalls = []): array
    {
        if ($pageType === 'detail') {
            return ['体入の流れと時給', 'バック・保証の詳細', '実際の雰囲気は？'];
        }

        $combined = $userMessage . ' ' . $aiResponse;

        // Count stores shown to offer drill-down options
        $storeCount = 0;
        foreach ($toolCalls as $call) {
            if ($call['name'] === 'search_stores') {
                $storeCount += $call['result']['count'] ?? 0;
            }
        }

        // Track what topics were already discussed
        $discussed = [
            'area' => (bool) preg_match('/六本木|新宿|銀座|渋谷|池袋|恵比寿|麻布|表参道|歌舞伎町/', $combined),
            'salary' => (bool) preg_match('/時給|給料|給与|バック|稼/', $combined),
            'beginner' => (bool) preg_match('/未経験|初めて|初心者/', $combined),
            'trial' => (bool) preg_match('/体入|体験入店/', $combined),
            'norma' => (bool) preg_match('/ノルマ/', $combined),
            'guarantee' => (bool) preg_match('/保証/', $combined),
        ];

        // Suggest topics NOT yet discussed
        $suggestions = [];
        if (!$discussed['trial']) $suggestions[] = '体入できるお店';
        if (!$discussed['salary']) $suggestions[] = '高時給ランキング';
        if (!$discussed['beginner']) $suggestions[] = '未経験でも安心なお店';
        if (!$discussed['norma']) $suggestions[] = 'ノルマなしのお店';
        if (!$discussed['guarantee']) $suggestions[] = '保証制度があるお店';
        if (!$discussed['area'] && $storeCount > 0) $suggestions[] = '別のエリアで探す';
        if ($storeCount > 0) $suggestions[] = 'もっと詳しく比較したい';

        return array_slice($suggestions, 0, 3) ?: ['未経験OKのお店', '高時給のお店', '体入できるお店'];
    }
}
