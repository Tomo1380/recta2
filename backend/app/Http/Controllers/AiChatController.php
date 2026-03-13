<?php

namespace App\Http\Controllers;

use App\Models\AiChatLimit;
use App\Models\AiChatLog;
use App\Models\AiChatSetting;
use App\Models\Area;
use App\Models\Category;
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
                            'description' => 'フリーワード検索。店名・説明文・最寄り駅・特徴テキスト・住所を横断検索。条件が特定できない場合に使う',
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
            $query->where('hourly_min', '>=', (int)$args['min_hourly']);
        }
        if (!empty($args['max_hourly'])) {
            $query->where('hourly_min', '<=', (int)$args['max_hourly']);
        }
        if (!empty($args['nearest_station'])) {
            $query->where('nearest_station', 'ilike', "%{$args['nearest_station']}%");
        }
        if (!empty($args['same_day_trial'])) {
            $query->where('same_day_trial', true);
        }
        if (!empty($args['has_guarantee'])) {
            $query->whereNotNull('guarantee_period')->where('guarantee_period', '!=', '');
        }
        if (!empty($args['keyword'])) {
            $kw = $args['keyword'];
            $query->where(function ($q) use ($kw) {
                $q->where('name', 'ilike', "%{$kw}%")
                  ->orWhere('description', 'ilike', "%{$kw}%")
                  ->orWhere('nearest_station', 'ilike', "%{$kw}%")
                  ->orWhere('features_text', 'ilike', "%{$kw}%")
                  ->orWhere('address', 'ilike', "%{$kw}%");
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
            'hourly_desc' => $query->orderByDesc('hourly_max'),
            'hourly_asc' => $query->orderBy('hourly_min'),
            'popular' => $query->withCount(['reviews' => fn($q) => $q->where('status', 'published')])->orderByDesc('reviews_count'),
            default => $query->orderByDesc('created_at'),
        };

        $limit = min((int)($args['limit'] ?? 5), 10);
        $stores = $query->limit($limit)->get();

        return [
            'count' => $stores->count(),
            'stores' => $stores->map(fn($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'area' => $s->area,
                'category' => $s->category,
                'nearest_station' => $s->nearest_station,
                'hourly_min' => $s->hourly_min,
                'hourly_max' => $s->hourly_max,
                'daily_estimate' => $s->daily_estimate,
                'same_day_trial' => $s->same_day_trial,
                'trial_hourly' => $s->trial_hourly,
                'guarantee_period' => $s->guarantee_period,
                'feature_tags' => $s->feature_tags ?? [],
                'description' => mb_substr($s->description ?? '', 0, 150),
                'images' => $s->images ?? [],
                'average_rating' => round($s->averageRating(), 1),
                'reviews_count' => $s->reviewCount(),
            ])->values()->toArray(),
        ];
    }

    private function toolGetStoreDetail(array $args): array
    {
        $store = Store::find($args['store_id'] ?? 0);
        if (!$store || $store->publish_status !== 'published') {
            return ['error' => '店舗が見つかりませんでした。'];
        }

        return [
            'id' => $store->id,
            'name' => $store->name,
            'area' => $store->area,
            'address' => $store->address,
            'nearest_station' => $store->nearest_station,
            'category' => $store->category,
            'business_hours' => $store->business_hours,
            'holidays' => $store->holidays,
            'hourly_min' => $store->hourly_min,
            'hourly_max' => $store->hourly_max,
            'daily_estimate' => $store->daily_estimate,
            'back_items' => $store->back_items,
            'fee_items' => $store->fee_items,
            'salary_notes' => $store->salary_notes,
            'guarantee_period' => $store->guarantee_period,
            'guarantee_details' => $store->guarantee_details,
            'norma_info' => $store->norma_info,
            'trial_avg_hourly' => $store->trial_avg_hourly,
            'trial_hourly' => $store->trial_hourly,
            'same_day_trial' => $store->same_day_trial,
            'feature_tags' => $store->feature_tags ?? [],
            'description' => $store->description,
            'features_text' => $store->features_text,
            'images' => $store->images ?? [],
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
            return $this->mockResponse($userMessage, $pageType, $storeId, $mode, $userId);
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
        $systemPrompt = $this->buildAgentSystemPrompt($setting, $storeContext, $userArea);
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
        $maxIterations = 5;

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

            $response = Http::timeout(30)->post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key={$apiKey}",
                $payload
            );

            if (!$response->successful()) {
                \Log::error('Gemini API raw error', ['status' => $response->status(), 'body' => substr($response->body(), 0, 1000)]);
                throw new \Exception('Gemini API error: ' . $response->status());
            }

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

                $recommendedStores = $this->extractStoreIdsFromToolCalls($toolCalls);
                $followUps = $this->generateFollowUps($pageType, $userMessage, $aiText, $toolCalls);

                return response()->json([
                    'message' => $aiText,
                    'stores' => $recommendedStores,
                    'follow_ups' => $followUps,
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
    private function extractStoreIdsFromToolCalls(array $toolCalls): array
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
        // OpenAI Fine-tuned model
        $openaiKey = config('services.openai.api_key');
        $openaiModel = config('services.openai.finetuned_model');

        if (!$openaiKey || !$openaiModel) {
            // Fallback to Gemini prompt-embedding mode if OpenAI not configured
            return $this->handleFinetunedModeFallback(
                $apiKey, $setting, $userMessage, $history,
                $pageType, $storeId, $ip, $startTime, $userArea, $userId
            );
        }

        $storeContext = $this->buildStoreContext($pageType, $storeId);
        $systemPrompt = $this->buildOpenAiSystemPrompt($setting, $storeContext, $userArea);

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
        $followUps = $this->generateFollowUps($pageType, $userMessage, $aiText);

        return response()->json([
            'message' => $displayText,
            'stores' => $recommendedStores,
            'follow_ups' => $followUps,
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
        $systemPrompt = $this->buildSystemPrompt($setting, $storeContext, $userArea);
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

        $response = Http::timeout(30)->post($endpoint, $payload);

        if (!$response->successful()) {
            throw new \Exception('Gemini API error: ' . $response->status());
        }

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
        $followUps = $this->generateFollowUps($pageType, $userMessage, $aiText);

        return response()->json([
            'message' => $displayText,
            'stores' => $recommendedStores,
            'follow_ups' => $followUps,
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
     * System prompt for OpenAI fine-tuned model (lighter than Gemini prompt-embedding)
     */
    private function buildOpenAiSystemPrompt(AiChatSetting $setting, string $storeContext, string $userArea = ''): string
    {
        $prompt = 'あなたはRecta AIです。ナイトワーク（キャバクラ・ラウンジ・ガールズバー・クラブ・コンカフェ）専門のキャリアアドバイザーとして、求職者の相談に親身に応えてください。丁寧だけどフレンドリーな口調で、具体的なお店の情報を交えて回答します。ナイトワーク以外の話題にはやんわりお断りしてください。回答の最後には必ず「もっと詳しく知りたい方は、LINEで担当者に直接相談できます！」を付けてください。';

        if ($setting->system_prompt) {
            $prompt .= "\n\n運営追加指示: {$setting->system_prompt}";
        }

        if ($userArea) {
            $prompt .= "\n\nユーザーは{$userArea}付近にいます。エリア指定がない場合は近くのお店を優先してください。";
        }

        if ($storeContext) {
            $prompt .= "\n\n参考店舗データ:\n{$storeContext}";
        }

        return $prompt;
    }

    // -----------------------------------------------------------------------
    // Prompt builders
    // -----------------------------------------------------------------------

    private function buildStoreContext(string $pageType, ?int $storeId): string
    {
        if ($pageType === 'detail' && $storeId) {
            $store = Store::find($storeId);
            if ($store) {
                $tags = implode(', ', $store->feature_tags ?? []);
                $backs = collect($store->back_items ?? [])
                    ->map(fn($b) => ($b['label'] ?? '') . ':' . ($b['amount'] ?? ''))
                    ->filter(fn($b) => $b !== ':')
                    ->implode(', ');

                $context = "【現在閲覧中の店舗】\n" .
                    "店名: {$store->name}\n" .
                    "エリア: {$store->area}（{$store->nearest_station}）\n" .
                    "カテゴリ: {$store->category}\n" .
                    "時給: {$store->hourly_min}〜{$store->hourly_max}円\n" .
                    "営業時間: {$store->business_hours}\n" .
                    "定休日: {$store->holidays}\n";

                if ($store->daily_estimate) $context .= "日給目安: {$store->daily_estimate}\n";
                if ($backs) $context .= "バック: {$backs}\n";
                if ($store->norma_info) $context .= "ノルマ: {$store->norma_info}\n";
                if ($store->guarantee_period) $context .= "保証: {$store->guarantee_period} {$store->guarantee_details}\n";
                if ($store->same_day_trial) $context .= "当日体入: OK（体入時給: {$store->trial_hourly}）\n";
                if ($tags) $context .= "特徴: {$tags}\n";
                $context .= "説明: {$store->description}\n";
                if ($store->features_text) $context .= "詳細特徴: {$store->features_text}\n";

                return $context;
            }
        }

        return '';
    }

    private function buildAgentSystemPrompt(AiChatSetting $setting, string $storeContext, string $userArea = ''): string
    {
        $toneDesc = $this->getToneDescription($setting->tone);

        $prompt = "【ペルソナ】\n" .
            "あなたは「Recta AI」です。ナイトワーク業界（キャバクラ・ラウンジ・ガールズバー・コンカフェ・クラブ）の求人に詳しい、フレンドリーなキャリアアドバイザーです。" .
            "求人マッチングプラットフォーム「Recta」の公式AIアシスタントとして、求職者の不安を解消し、最適なお店選びをサポートします。\n" .
            "口調: {$toneDesc}\n" .
            "一人称は使わない。「おすすめは〜」「ご紹介します」のような表現を使う。\n\n";

        if ($setting->system_prompt) {
            $prompt .= "【運営からの追加指示】\n{$setting->system_prompt}\n\n";
        }

        if ($storeContext) {
            $prompt .= "【現在の文脈】\n{$storeContext}\n\n";
        }

        if ($userArea) {
            $prompt .= "【ユーザーの現在地】{$userArea}付近にいます。エリア指定がない質問の場合、この地域周辺のお店を優先的に紹介してください。\n\n";
        }

        $prompt .= "【絶対ルール】\n" .
            "1. ユーザーに質問を返してはいけない。「どのエリアですか？」「どんな条件ですか？」等は禁止。条件が曖昧でも推測してsearch_storesを呼び出す\n" .
            "2. 必ずsearch_storesツールを呼び出して実データから回答する。自分の知識だけで店舗を紹介してはいけない\n" .
            "3. 検索結果から2〜3件を厳選して紹介する（5件以上の羅列はNG）\n" .
            "4. 絵文字は使わない\n" .
            "5. 日本語のみで回答する\n\n" .

            "【検索のコツ】\n" .
            "- 「初めて」「初心者」→ tags: [\"未経験歓迎\"] で検索\n" .
            "- 「稼ぎたい」「高収入」「高時給」→ sort: \"hourly_desc\" で検索\n" .
            "- 「体入」「体験」→ same_day_trial: true で検索\n" .
            "- 「ゆるい」「ノルマない」→ tags: [\"ノルマなし\"] で検索\n" .
            "- 「送りあり」「終電」→ tags: [\"送りあり\"] or tags: [\"終電上がりOK\"]\n" .
            "- 「日払い」→ tags: [\"日払いあり\"]\n" .
            "- エリア不明 + ユーザー現在地あり → ユーザー現在地周辺で検索\n" .
            "- エリア不明 + 現在地なし → 条件のみで検索（エリアは空のまま）\n" .
            "- 比較質問（「AとBどっちがいい？」）→ get_store_detailを2回呼んで比較\n" .
            "- 条件が多い場合は最も重要な条件2〜3個に絞って検索する\n\n" .

            "【給与・待遇に関する回答】\n" .
            "- 時給は必ず「○,○○○円〜」の形式で表示（確定値のように書かない）\n" .
            "- バック率や日給は「目安」「実績による」等の注釈を付ける\n" .
            "- 保証期間がある場合は積極的に言及する（安心材料になる）\n" .
            "- 体入の有無と体入時給も重要情報として紹介する\n\n" .

            "【検索結果0件の場合】\n" .
            "- 「ご希望の条件ではお店が見つかりませんでした」と正直に伝える\n" .
            "- 条件を緩めた代替検索を自動で実行する（例: エリアを外す、タグを減らす）\n" .
            "- 「条件を少し変えて探してみました」と添えて代替結果を紹介する\n\n" .

            "【ナイトワーク以外の質問】\n" .
            "- 「申し訳ありませんが、Recta AIはナイトワーク求人の相談専門です。お仕事探しについてお気軽にご質問ください！」と返す\n" .
            "- この場合search_storesは呼ばなくてOK\n\n" .

            "【センシティブな話題】\n" .
            "- 違法行為・風営法違反に関する質問には応じない\n" .
            "- 「詳しくはLINEで担当者にご相談ください」と誘導する\n" .
            "- 個人情報（電話番号・住所等）は聞かない・教えない\n\n" .

            "【回答の長さ】\n" .
            "- 店舗紹介は1店舗あたり1〜2行で簡潔に\n" .
            "- 全体で300〜500文字程度が目安（必要に応じて調整OK）\n" .
            "- 冗長にならず、かつ必要な情報は省略しない\n\n" .

            "【回答フォーマット】\n" .
            "各店舗は以下の形式で紹介:\n" .
            "・店名（エリア/最寄り駅）時給○,○○○円〜\n" .
            "  [1行で特徴やおすすめポイント]\n\n" .

            "【LINE誘導】\n" .
            "回答の最後に必ず改行2つの後に以下を付ける:\n" .
            "もっと詳しく知りたい方は、LINEで担当者に直接相談できます！\n\n" .

            "【回答例1: 条件検索】\n" .
            "ユーザー: 未経験で六本木のラウンジ探してます\n\n" .
            "回答: 未経験歓迎の六本木ラウンジをご紹介します！\n\n" .
            "・Lounge Étoile（六本木/六本木駅）時給4,000円〜\n" .
            "  未経験でも安心の研修制度あり。送りも完備で終電を気にせず働けます\n\n" .
            "・Lounge Brilliance（六本木/六本木一丁目駅）時給3,500円〜\n" .
            "  ノルマなしでプレッシャーなし。体入当日OK・全額日払いなので気軽にお試しできます\n\n" .
            "どちらも保証期間があるので、初めてでも安心してスタートできますよ。\n\n" .
            "もっと詳しく知りたい方は、LINEで担当者に直接相談できます！\n\n" .

            "【回答例2: 曖昧な質問】\n" .
            "ユーザー: 稼げるお店教えて\n\n" .
            "回答: 高時給のお店をピックアップしました！\n\n" .
            "・Club Lumière（六本木/六本木駅）時給6,000円〜\n" .
            "  ドリンクバック・指名バックが充実。経験者なら高収入が目指せます\n\n" .
            "・Club Royal（銀座/銀座駅）時給5,500円〜\n" .
            "  売上バック率が高く、頑張り次第で大幅な収入アップが可能です\n\n" .
            "もっと詳しく知りたい方は、LINEで担当者に直接相談できます！\n\n" .

            "【間違った回答例 - 絶対にNG】\n" .
            "「どのエリアがご希望ですか？」← 質問返しは禁止\n" .
            "「キャバクラAは時給5000円です」← search_storesを呼ばずに回答するのは禁止";

        return $prompt;
    }

    private function buildSystemPrompt(AiChatSetting $setting, string $storeContext, string $userArea = ''): string
    {
        $toneDesc = $this->getToneDescription($setting->tone);

        // For finetuned mode, include store data inline since no tools available
        $storeData = $storeContext;
        if (!$storeData) {
            $storeData = Cache::remember('public_stores_summary_v2', 600, function () {
                return Store::where('publish_status', 'published')
                    ->get()
                    ->map(function ($s) {
                        $line = "[STORE:{$s->id}] {$s->name}（{$s->area}/{$s->category}）";
                        $line .= " 最寄り:{$s->nearest_station}";
                        $line .= " 時給:{$s->hourly_min}〜{$s->hourly_max}円";
                        if ($s->daily_estimate) $line .= " 日給目安:{$s->daily_estimate}";
                        if ($s->same_day_trial) $line .= " 当日体入OK";
                        if ($s->trial_hourly) $line .= " 体入時給:{$s->trial_hourly}";
                        if ($s->guarantee_period) $line .= " 保証:{$s->guarantee_period}";
                        if ($s->norma_info) $line .= " ノルマ:{$s->norma_info}";
                        $tags = implode(',', $s->feature_tags ?? []);
                        if ($tags) $line .= " 特徴:{$tags}";
                        $backs = collect($s->back_items ?? [])->pluck('label')->filter()->implode(',');
                        if ($backs) $line .= " バック:{$backs}";
                        return $line;
                    })
                    ->implode("\n");
            });
            $storeData = "【掲載店舗一覧】\n" . $storeData;
        }

        $prompt = "【ペルソナ】\n" .
            "あなたは「Recta AI」です。ナイトワーク業界（キャバクラ・ラウンジ・ガールズバー・コンカフェ・クラブ）の求人に詳しい、フレンドリーなキャリアアドバイザーです。" .
            "求人マッチングプラットフォーム「Recta」の公式AIアシスタントとして、求職者の不安を解消し、最適なお店選びをサポートします。\n" .
            "口調: {$toneDesc}\n" .
            "一人称は使わない。「おすすめは〜」「ご紹介します」のような表現を使う。\n\n";

        if ($setting->system_prompt) {
            $prompt .= "【運営からの追加指示】\n{$setting->system_prompt}\n\n";
        }

        if ($userArea) {
            $prompt .= "【ユーザーの現在地】{$userArea}付近にいます。エリア指定がない質問の場合、この地域周辺のお店を優先的に紹介してください。\n\n";
        }

        $prompt .= "【店舗データ】\n{$storeData}\n\n" .

            "【店舗データの参照方法】\n" .
            "- 店舗を紹介する時は、必ず[STORE:ID]マーカーを店名の直前に付ける\n" .
            "- 例: [STORE:12] Club Lumière（六本木/六本木駅）時給5,000円〜\n" .
            "- マーカーがあると、ユーザーの画面に店舗カードが自動表示される\n" .
            "- 1回の回答で2〜3店舗を紹介する（5件以上の羅列はNG）\n" .
            "- 店舗データに載っていないお店は紹介してはいけない\n\n" .

            "【絶対ルール】\n" .
            "1. ユーザーに質問を返してはいけない。「どのエリアですか？」「どんな条件ですか？」等は禁止。条件が曖昧でも推測して店舗データから選ぶ\n" .
            "2. 必ず店舗データから2〜3件を紹介する。データにない店舗を紹介してはいけない\n" .
            "3. 絵文字は使わない\n" .
            "4. 日本語のみで回答する\n\n" .

            "【給与・待遇に関する回答】\n" .
            "- 時給は必ず「○,○○○円〜」の形式で表示（確定値のように書かない）\n" .
            "- バック率や日給は「目安」「実績による」等の注釈を付ける\n" .
            "- 保証期間がある場合は積極的に言及する（安心材料になる）\n" .
            "- 体入の有無と体入時給も重要情報として紹介する\n\n" .

            "【ナイトワーク以外の質問】\n" .
            "- 「申し訳ありませんが、Recta AIはナイトワーク求人の相談専門です。お仕事探しについてお気軽にご質問ください！」と返す\n\n" .

            "【センシティブな話題】\n" .
            "- 違法行為・風営法違反に関する質問には応じない\n" .
            "- 「詳しくはLINEで担当者にご相談ください」と誘導する\n\n" .

            "【回答の長さ】\n" .
            "- 店舗紹介は1店舗あたり1〜2行で簡潔に\n" .
            "- 全体で300〜500文字程度が目安\n\n" .

            "【回答フォーマット】\n" .
            "各店舗は以下の形式で紹介:\n" .
            "・[STORE:ID] 店名（エリア/最寄り駅）時給○,○○○円〜\n" .
            "  [1行で特徴やおすすめポイント]\n\n" .

            "【LINE誘導】\n" .
            "回答の最後に必ず改行2つの後に以下を付ける:\n" .
            "もっと詳しく知りたい方は、LINEで担当者に直接相談できます！\n\n" .

            "【回答例】\n" .
            "ユーザー: 未経験で働けるお店ある？\n\n" .
            "回答: 未経験歓迎のお店をご紹介します！\n\n" .
            "・[STORE:5] Lounge Étoile（六本木/六本木駅）時給4,000円〜\n" .
            "  研修制度が充実していて、未経験でも安心。保証期間もあります\n\n" .
            "・[STORE:8] Lounge Brilliance（銀座/銀座駅）時給3,500円〜\n" .
            "  ノルマなしで気楽に働ける環境。当日体入OK・全額日払いです\n\n" .
            "もっと詳しく知りたい方は、LINEで担当者に直接相談できます！\n\n" .

            "【間違った回答例 - 絶対にNG】\n" .
            "「どのエリアがご希望ですか？」← 質問返しは禁止\n" .
            "「おすすめのお店は〇〇です」← [STORE:ID]マーカーなしで紹介するのは禁止";

        return $prompt;
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
        preg_match_all('/\[STORE:(\d+)\]/', $text, $matches);
        if (empty($matches[1])) {
            return [];
        }

        $ids = array_unique($matches[1]);
        return Store::whereIn('id', $ids)
            ->where('publish_status', 'published')
            ->get()
            ->map(fn($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'area' => $s->area,
                'category' => $s->category,
                'hourly_min' => $s->hourly_min,
                'hourly_max' => $s->hourly_max,
                'feature_tags' => $s->feature_tags,
                'images' => $s->images,
                'average_rating' => round($s->averageRating(), 1),
            ])
            ->values()
            ->toArray();
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
            $query->orderByDesc('hourly_max');
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

        $storeCards = $stores->map(fn($s) => [
            'id' => $s->id,
            'name' => $s->name,
            'area' => $s->area,
            'category' => $s->category,
            'nearest_station' => $s->nearest_station,
            'hourly_min' => $s->hourly_min,
            'hourly_max' => $s->hourly_max,
            'feature_tags' => $s->feature_tags,
            'description' => mb_substr($s->description ?? '', 0, 100),
            'images' => $s->images,
            'average_rating' => round($s->averageRating(), 1),
        ])->values()->toArray();

        $lineCta = "\n\nもっと詳しく知りたい方は、LINEで担当者に直接相談できます！";

        // Build response with actual store names and details
        $storeList = $stores->map(function ($s) {
            $line = "・{$s->name}（{$s->area}/{$s->nearest_station}）時給" . number_format($s->hourly_min) . "〜" . number_format($s->hourly_max) . "円";
            $features = [];
            if ($s->same_day_trial) $features[] = '当日体入OK';
            if ($s->guarantee_period) $features[] = '保証あり';
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

        $followUps = $this->generateFollowUps($pageType, $message, $response);

        return response()->json([
            'message' => $response,
            'stores' => $storeCards,
            'follow_ups' => $followUps,
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
