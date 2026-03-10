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
                'description' => '条件に合う店舗を検索する。エリア、カテゴリ、時給、特徴タグなどで絞り込みが可能。',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'area' => [
                            'type' => 'string',
                            'description' => 'エリア名（例: 新宿, 六本木, 銀座）',
                        ],
                        'category' => [
                            'type' => 'string',
                            'description' => 'カテゴリ名（例: キャバクラ, ラウンジ, クラブ, ガールズバー）',
                        ],
                        'min_hourly' => [
                            'type' => 'integer',
                            'description' => '最低時給（例: 3000）',
                        ],
                        'tags' => [
                            'type' => 'array',
                            'items' => ['type' => 'string'],
                            'description' => '特徴タグ（例: ["未経験歓迎", "日払いOK", "ノルマなし"]）',
                        ],
                        'keyword' => [
                            'type' => 'string',
                            'description' => 'フリーワード検索（店名、説明文など）',
                        ],
                        'sort' => [
                            'type' => 'string',
                            'enum' => ['newest', 'hourly_desc', 'hourly_asc', 'popular'],
                            'description' => 'ソート順',
                        ],
                        'limit' => [
                            'type' => 'integer',
                            'description' => '取得件数（デフォルト5）',
                        ],
                    ],
                ],
            ],
            [
                'name' => 'get_store_detail',
                'description' => '特定の店舗の詳細情報を取得する。時給、バック、ノルマ、体入、雰囲気など。',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'store_id' => [
                            'type' => 'integer',
                            'description' => '店舗ID',
                        ],
                    ],
                    'required' => ['store_id'],
                ],
            ],
            [
                'name' => 'get_areas',
                'description' => '利用可能なエリア一覧を取得する。',
                'parameters' => [
                    'type' => 'object',
                    'properties' => (object)[],
                ],
            ],
            [
                'name' => 'get_categories',
                'description' => '利用可能な業種カテゴリ一覧を取得する。',
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
        if (!empty($args['keyword'])) {
            $kw = $args['keyword'];
            $query->where(function ($q) use ($kw) {
                $q->where('name', 'ilike', "%{$kw}%")
                  ->orWhere('description', 'ilike', "%{$kw}%")
                  ->orWhere('nearest_station', 'ilike', "%{$kw}%");
            });
        }
        if (!empty($args['tags'])) {
            foreach ($args['tags'] as $tag) {
                $query->whereJsonContains('feature_tags', trim($tag));
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
                'feature_tags' => $s->feature_tags ?? [],
                'description' => mb_substr($s->description ?? '', 0, 100),
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
                    'temperature' => 0.7,
                    'maxOutputTokens' => 1024,
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
                $followUps = $this->generateFollowUps($pageType, $userMessage);

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
        $storeContext = $this->buildStoreContext($pageType, $storeId);
        $systemPrompt = $this->buildSystemPrompt($setting, $storeContext, $userArea);
        $geminiHistory = $this->buildGeminiHistory($history);

        // Use tuned model if configured, otherwise fall back to base model
        $tunedModelId = config('services.gemini.tuned_model_id');
        $model = $tunedModelId ?: 'gemini-3.1-flash-lite-preview';
        $endpoint = $tunedModelId
            ? "https://generativelanguage.googleapis.com/v1beta/{$tunedModelId}:generateContent?key={$apiKey}"
            : "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

        $payload = [
            'contents' => [
                ...$geminiHistory,
                [
                    'role' => 'user',
                    'parts' => [['text' => $userMessage]],
                ],
            ],
            'generationConfig' => [
                'temperature' => 0.5,
                'maxOutputTokens' => 1024,
            ],
        ];

        // Tuned models may not support system_instruction
        if (!$tunedModelId) {
            $payload['system_instruction'] = [
                'parts' => [['text' => $systemPrompt]],
            ];
        }

        $response = Http::timeout(30)->post($endpoint, $payload);

        if (!$response->successful()) {
            throw new \Exception('Gemini API error: ' . $response->status());
        }

        $data = $response->json();
        $aiText = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
        $inputTokens = $data['usageMetadata']['promptTokenCount'] ?? 0;
        $outputTokens = $data['usageMetadata']['candidatesTokenCount'] ?? 0;
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
        $followUps = $this->generateFollowUps($pageType, $userMessage);

        return response()->json([
            'message' => $aiText,
            'stores' => $recommendedStores,
            'follow_ups' => $followUps,
            'meta' => [
                'mode' => 'finetuned',
                'model' => $tunedModelId ?: $model,
                'input_tokens' => $inputTokens,
                'output_tokens' => $outputTokens,
                'total_tokens' => $inputTokens + $outputTokens,
                'response_ms' => $elapsed,
                'tool_calls' => 0,
            ],
        ]);
    }

    // -----------------------------------------------------------------------
    // Prompt builders
    // -----------------------------------------------------------------------

    private function buildStoreContext(string $pageType, ?int $storeId): string
    {
        if ($pageType === 'detail' && $storeId) {
            $store = Store::find($storeId);
            if ($store) {
                return "【現在閲覧中の店舗】\n" .
                    "店名: {$store->name}\n" .
                    "エリア: {$store->area}\n" .
                    "カテゴリ: {$store->category}\n" .
                    "時給: {$store->hourly_min}〜{$store->hourly_max}円\n" .
                    "営業時間: {$store->business_hours}\n" .
                    "特徴: " . implode(', ', $store->feature_tags ?? []) . "\n" .
                    "説明: {$store->description}\n";
            }
        }

        return '';
    }

    private function buildAgentSystemPrompt(AiChatSetting $setting, string $storeContext, string $userArea = ''): string
    {
        $toneDesc = $this->getToneDescription($setting->tone);

        $prompt = $setting->system_prompt . "\n\n" .
            "【トーン】{$toneDesc}で返答してください。\n\n";

        if ($storeContext) {
            $prompt .= "【現在の文脈】\n{$storeContext}\n\n";
        }

        if ($userArea) {
            $prompt .= "【ユーザーの現在地】{$userArea}付近にいます。エリア指定がない質問の場合、この地域周辺のお店を優先的に紹介してください。\n\n";
        }

        $prompt .= "【最重要ルール - 絶対に守ること】\n" .
            "1. ユーザーに質問を返してはいけない。「どのような〜ですか？」「どんな〜がいいですか？」「もう少し詳しく〜」等は禁止\n" .
            "2. どんな質問でも必ずsearch_storesツールを呼び出して、実際の店舗データから2〜3件を紹介すること\n" .
            "3. 条件が曖昧でも推測して検索すること。情報不足を理由に質問してはいけない\n\n" .
            "【回答フォーマット】\n" .
            "- 必ず日本語で回答\n" .
            "- 各店舗は「店名（エリア）時給○○円〜」の形式で紹介\n" .
            "- 回答は簡潔に、200文字以内\n" .
            "- 回答の最後に必ず改行して「💬 もっと詳しく知りたい方は、LINEで担当者に直接相談できます！」を付けること\n" .
            "- 絵文字は使わない（LINE誘導文の💬のみ例外）\n" .
            "- ナイトワーク以外の質問には対応できないと伝えること\n\n" .
            "【回答例】\n" .
            "ユーザー: バック率が高いお店は？\n" .
            "正しい回答: バック率が高いお店をご紹介します！\n\n" .
            "・Club Lumière（六本木）時給5,000円〜 ドリンクバック・指名バックが充実\n" .
            "・Lounge Étoile（銀座）時給4,000円〜 売上バック率が業界トップクラス\n\n" .
            "💬 もっと詳しく知りたい方は、LINEで担当者に直接相談できます！\n\n" .
            "間違った回答: 「バック率が高いお店をお探しですね！どのエリアがご希望ですか？」← これは絶対にNG";

        return $prompt;
    }

    private function buildSystemPrompt(AiChatSetting $setting, string $storeContext, string $userArea = ''): string
    {
        $toneDesc = $this->getToneDescription($setting->tone);

        // For finetuned mode, include store data inline since no tools available
        $fullContext = $storeContext;
        if (!$fullContext) {
            $fullContext = Cache::remember('public_stores_summary', 300, function () {
                return Store::where('publish_status', 'published')
                    ->get(['id', 'name', 'area', 'category', 'hourly_min', 'hourly_max', 'feature_tags'])
                    ->map(fn($s) => "ID:{$s->id} {$s->name}（{$s->area}/{$s->category}）時給{$s->hourly_min}〜{$s->hourly_max}円 特徴:" . implode(',', $s->feature_tags ?? []))
                    ->implode("\n");
            });
            $fullContext = "【掲載店舗一覧】\n" . $fullContext;
        }

        $areaContext = '';
        if ($userArea) {
            $areaContext = "【ユーザーの現在地】{$userArea}付近にいます。エリア指定がない質問の場合、この地域周辺のお店を優先的に紹介してください。\n\n";
        }

        return $setting->system_prompt . "\n\n" .
            "【トーン】{$toneDesc}で返答してください。\n\n" .
            $areaContext .
            "【店舗データ】\n{$fullContext}\n\n" .
            "【最重要ルール - 絶対に守ること】\n" .
            "1. ユーザーに質問を返してはいけない。「どのような〜ですか？」「どんな〜がいいですか？」「もう少し詳しく〜」等は禁止\n" .
            "2. どんな質問でも必ず店舗データから2〜3件を紹介すること（例: [STORE:1]）\n" .
            "3. 条件が曖昧でも推測して紹介すること。情報不足を理由に質問してはいけない\n\n" .
            "【回答フォーマット】\n" .
            "- 必ず日本語で回答\n" .
            "- 回答は簡潔に、200文字以内\n" .
            "- 回答の最後に必ず改行して「💬 もっと詳しく知りたい方は、LINEで担当者に直接相談できます！」を付けること\n" .
            "- 絵文字は使わない（LINE誘導文の💬のみ例外）\n" .
            "- ナイトワーク以外の質問には対応できないと伝えること\n\n" .
            "【回答例】\n" .
            "ユーザー: バック率が高いお店は？\n" .
            "正しい回答: バック率が高いお店をご紹介します！\n\n" .
            "・[STORE:1] Club Lumière（六本木）時給5,000円〜\n" .
            "・[STORE:2] Lounge Étoile（銀座）時給4,000円〜\n\n" .
            "💬 もっと詳しく知りたい方は、LINEで担当者に直接相談できます！\n\n" .
            "間違った回答: 「どのエリアがご希望ですか？」← これは絶対にNG";
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

        $lineCta = "\n\n💬 もっと詳しく知りたい方は、LINEで担当者に直接相談できます！";

        // Build response with actual store names
        $storeList = $stores->map(fn($s) =>
            "・{$s->name}（{$s->area}）時給" . number_format($s->hourly_min) . "〜" . number_format($s->hourly_max) . "円"
        )->implode("\n");

        if (str_contains($message, '未経験')) {
            $response = "未経験歓迎のお店をご紹介します！\n\n{$storeList}\n\nどのお店も研修制度が充実していて、初めての方でも安心です。{$lineCta}";
        } elseif (str_contains($message, '時給') || str_contains($message, '給料') || str_contains($message, 'バック') || str_contains($message, '高時給')) {
            $response = "高時給・高バックのお店をピックアップしました！\n\n{$storeList}\n\n時給やバック率の詳細はお気軽にご相談ください。{$lineCta}";
        } elseif (str_contains($message, 'ノルマ')) {
            $response = "ノルマなしで働けるお店をご紹介します！\n\n{$storeList}\n\nプレッシャーなく自分のペースで働ける環境です。{$lineCta}";
        } elseif (str_contains($message, '体入') || str_contains($message, '体験入店')) {
            $response = "体験入店できるお店をご紹介します！\n\n{$storeList}\n\n当日体入OKのお店もありますので、お気軽にどうぞ。{$lineCta}";
        } else {
            $response = "条件に合いそうなお店をご紹介しますね！\n\n{$storeList}{$lineCta}";
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

        $followUps = $this->generateFollowUps($pageType, $message);

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

    private function generateFollowUps(string $pageType, string $userMessage): array
    {
        if ($pageType === 'detail') {
            return ['体験入店の流れ', '給与・バック詳細', '面接の服装・準備'];
        }

        if (str_contains($userMessage, '未経験')) {
            return ['体入できるお店', '日払いOKのお店', 'ノルマなしのお店'];
        }
        if (str_contains($userMessage, '時給') || str_contains($userMessage, '給料') || str_contains($userMessage, '給与') || str_contains($userMessage, 'バック')) {
            return ['日払いOKのお店', '未経験OKの高時給', '六本木エリア'];
        }
        if (str_contains($userMessage, 'ノルマ')) {
            return ['未経験歓迎のお店', '終電上がりOK', '高時給のお店'];
        }

        return ['未経験OKのお店', 'バック率が高いお店', 'ノルマなしのお店'];
    }
}
