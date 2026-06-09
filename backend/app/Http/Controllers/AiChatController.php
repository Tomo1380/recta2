<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChatRequest;
use App\Models\AiChatLimit;
use App\Models\AiChatLog;
use App\Models\AiChatSetting;
use App\Models\Area;
use App\Models\Article;
use App\Models\Category;
use App\Models\IndustryKnowledge;
use App\Models\Store;
use App\Services\AiChat\GeminiClient;
use App\Services\AiChat\PromptBuilder;
use App\Services\AiChat\StoreToolRegistry;
use App\Services\AiChat\UsageLimitGuard;
use App\Support\AgentTextSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiChatController extends Controller
{
    public function __construct(
        private StoreToolRegistry $tools,
        private GeminiClient $gemini,
        private UsageLimitGuard $usageLimits,
        private PromptBuilder $prompt,
    ) {}


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
                'suggest_categories' => [],
                'suggest_display_mode' => 'off',
            ]);
        }

        return response()->json([
            'enabled' => true,
            'suggest_categories' => $setting->suggest_categories ?? [],
            'suggest_display_mode' => $setting->suggest_display_mode ?? 'categorized',
        ]);
    }

    /**
     * Handle chat message — Gemini agent mode (Function Calling) のみ。
     */
    public function chat(ChatRequest $request): JsonResponse
    {
        $ip = $request->ip();
        $pageType = $request->input('page_type');
        $userMessage = $request->input('message');
        $storeId = $request->input('store_id');
        $history = $request->input('history', []);
        $userArea = $request->input('user_area') ?? '';

        // Resolve authenticated user (optional auth — no middleware required)
        $user = auth('sanctum')->user();

        // --- Usage limit checks ---
        $limitCheck = $this->usageLimits->check($user, $ip);
        if ($limitCheck) {
            return response()->json($limitCheck, 429);
        }

        // Get system prompt
        $setting = AiChatSetting::where('page_type', $pageType)->first();
        if (!$setting || !$setting->enabled) {
            return response()->json([
                'message' => 'チャットは現在無効です。',
            ], 403);
        }

        $apiKey = config('services.gemini.api_key');
        if (!$apiKey) {
            // 本番で API キー未設定はミスコンフィグ。モックを出すと利用者に偽の
            // 案内をしてしまうので、混雑時と同じ丁寧なエラーを返して気付けるよう
            // error ログを残す。dev のみモックで UI を動かせるようにする。
            if (app()->environment('production')) {
                \Log::error('AiChat: GEMINI_API_KEY not set in production');
                return response()->json([
                    'message' => 'ただいまAIチャットをご利用いただけません。お手数ですがLINEから直接ご相談ください。',
                    'stores' => [],
                    'follow_ups' => [],
                    'meta' => ['mode' => 'agent', 'model' => 'unavailable'],
                ], 503);
            }
            \Log::warning('AiChat: GEMINI_API_KEY not set, returning mock response (non-production)');
            return $this->mockResponse($userMessage, $pageType, $storeId);
        }

        $startTime = microtime(true);

        $userId = $user?->id;

        try {
            return $this->handleAgentMode($apiKey, $setting, $userMessage, $history, $pageType, $storeId, $ip, $startTime, $userArea, $userId);
        } catch (\Exception $e) {
            \Log::error('AiChat error', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json([
                'message' => 'ただいま混み合っております。少し時間を置いてから再度お試しください。',
                'stores' => [],
                'follow_ups' => [],
                'meta' => [
                    'mode' => 'agent',
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
        $storeContext = $this->prompt->buildStoreContext($pageType, $storeId);
        $systemPrompt = $this->prompt->buildAgentSystemPrompt($setting, $storeContext, $userArea, $pageType);
        $geminiHistory = $this->prompt->buildGeminiHistory($history);

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
                    ['functionDeclarations' => $this->tools->getDeclarations()],
                ],
                'generationConfig' => [
                    'temperature' => 0.4,
                    'maxOutputTokens' => 2048,
                ],
            ];

            $response = $this->gemini->generate($apiKey, $payload);

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
                // Strip [STORE:ID] markers + guard against fabricated store lines
                $displayText = AgentTextSanitizer::strip($aiText, !empty($recommendedStores));

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

                $result = $this->tools->execute($toolName, $toolArgs);
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

        // Max iterations reached. 以前はここで例外を投げ、収集済みの店舗候補も
        // 含めて汎用エラーにフォールバックしていた。せっかく検索できた店舗を捨てて
        // しまうのは UX/誘導の観点で損なので、集めた店舗を活かした正常応答を返す
        // (これは 200 完了扱いなので、フロントの LINE 誘導 CTA も表示される)。
        \Log::info('AiChat: agent loop hit max iterations, returning collected stores', [
            'tool_calls' => count($toolCalls),
        ]);

        $recommendedStores = $this->extractStoreIdsFromToolCalls($toolCalls);
        $fallbackText = !empty($recommendedStores)
            ? 'ご希望に近いお店をいくつかご紹介します。気になるお店があれば、LINEから気軽にご相談くださいね。'
            : 'うまくお探しできませんでした。条件を変えて試すか、LINEから直接ご相談ください。スタッフが一緒にお店探しをお手伝いします。';
        $elapsed = round((microtime(true) - $startTime) * 1000);

        AiChatLog::create([
            'user_id' => $userId,
            'ip_address' => $ip,
            'page_type' => $pageType,
            'user_message' => $userMessage,
            'ai_response' => $fallbackText,
            'input_tokens' => $totalInputTokens,
            'output_tokens' => $totalOutputTokens,
            'mode' => 'agent',
        ]);

        return response()->json([
            'message' => $fallbackText,
            'stores' => $recommendedStores,
            'follow_ups' => [],
            'meta' => [
                'mode' => 'agent',
                'input_tokens' => $totalInputTokens,
                'output_tokens' => $totalOutputTokens,
                'total_tokens' => $totalInputTokens + $totalOutputTokens,
                'response_ms' => $elapsed,
                'tool_calls' => count($toolCalls),
                'max_iterations_reached' => true,
            ],
        ]);
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
                        'trial_hourly_min' => $s['trial_hourly_min'] ?? null,
                        'trial_hourly_max' => $s['trial_hourly_max'] ?? null,
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

    /**
     * Fallback response when Gemini API key is not configured.
     */
    private function mockResponse(string $message, string $pageType, ?int $storeId, ?int $userId = null): JsonResponse
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
            // 通常時給は廃止。体入時給 (wage.trial) の高い順。
            $query->orderByRaw("nullif(regexp_replace(coalesce(wage->'trial'->>'hourly_max', wage->'trial'->>'hourly', wage->'trial'->>'hourly_min', wage->'trial'->>'avg_hourly',''),'[^0-9]','','g'),'')::int desc nulls last");
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
            $trial   = $wage['trial'] ?? [];
            return [
                'id' => $s->id,
                'name' => $s->name,
                'area' => $s->area,
                'category' => $s->category,
                'nearest_station' => $s->nearest_station,
                // 通常時給は廃止。給与は体入時給 (trial_hourly_*) に一本化。
                'trial_hourly_min' => $trial['hourly_min'] ?? $trial['avg_hourly'] ?? null,
                'trial_hourly_max' => $trial['hourly_max'] ?? $trial['hourly'] ?? null,
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
            $trial     = $wage['trial'] ?? [];
            $guarantee = is_array($s->guarantee) ? $s->guarantee : [];
            // 通常時給は廃止。表示は体入時給。
            $hourlyMin = (int) preg_replace('/[^\d]/', '', (string) ($trial['hourly_min'] ?? $trial['avg_hourly'] ?? 0));
            $hourlyMax = (int) preg_replace('/[^\d]/', '', (string) ($trial['hourly_max'] ?? $trial['hourly'] ?? 0));

            $line = "・{$s->name}（{$s->area}/{$s->nearest_station}）体入時給" . number_format($hourlyMin) . "〜" . number_format($hourlyMax) . "円";
            $features = [];
            // same_day_trial は enum string ('same_day'|'normal'|'none')。'none' も
            // 非空なので !empty 判定は誤り (体入なしを体入確約扱いしてしまう)。
            $trialType = $guarantee['same_day_trial'] ?? 'none';
            if ($trialType === 'same_day') $features[] = '体入確約OK';
            elseif ($trialType === 'normal') $features[] = '体入あり';
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
            $response = "体験入店できるお店をご紹介します！\n\n{$storeList}\n\n体入確約OKのお店なら、思い立ったらすぐ体験できます。{$lineCta}";
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
            'mode' => 'agent',
        ]);

        return response()->json([
            'message' => $response,
            'stores' => $storeCards,
            'follow_ups' => [],
            'meta' => [
                'mode' => 'agent',
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

    // -----------------------------------------------------------------------
    // SSE streaming endpoint
    // -----------------------------------------------------------------------
    //
    // 既存の chat() は完全レスポンスを一括 JSON で返す（待たされる→ドンと出る）。
    // この chatStream() は同じ payload を受け取り、Server-Sent Events で逐次返す：
    //
    //   event: status   data: {"label":"店舗を検索しています…"}
    //   event: text     data: {"delta":"こんにちは"}
    //   event: done     data: {"stores":[...],"meta":{...}}
    //   event: error    data: {"message":"..."}
    //
    // Function Calling のループは内部的には非ストリーミング（Gemini API の制約上
    // ツール呼び出しと chunked text を綺麗に混ぜるのは煩雑なので避ける）。
    // 代わりにツール段階ごとに status を、最終回答は短いチャンクに分けて
    // **擬似タイプライター** として配信する。これでも体感速度は大きく向上する。

    public function chatStream(ChatRequest $request)
    {
        $ip = $request->ip();
        $pageType = $request->input('page_type');
        $userMessage = $request->input('message');
        $storeId = $request->input('store_id');
        $history = $request->input('history', []);
        $userArea = $request->input('user_area') ?? '';

        $user = auth('sanctum')->user();
        $userId = $user?->id;

        // Capture refs into the streamer closure
        $self = $this;
        $usageLimits = $this->usageLimits;
        $tools = $this->tools;
        $gemini = $this->gemini;

        $callback = function () use (
            $self, $usageLimits, $tools, $gemini,
            $request, $user, $ip, $pageType, $userMessage,
            $storeId, $history, $userArea, $userId
        ) {
            // Disable output buffering so each echo flushes immediately.
            // (php-fpm + nginx with proxy_buffering off — see nginx.conf changes.)
            @ini_set('output_buffering', '0');
            @ini_set('zlib.output_compression', '0');
            while (ob_get_level() > 0) { @ob_end_flush(); }

            $send = function (string $event, array $data) {
                echo "event: {$event}\n";
                echo 'data: ' . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n\n";
                @ob_flush();
                @flush();
            };

            try {
                // Limit checks (mirror chat())
                $limitCheck = $usageLimits->check($user, $ip);
                if ($limitCheck !== null) {
                    $send('error', $limitCheck);
                    return;
                }

                $setting = AiChatSetting::where('page_type', $pageType)->first();
                if (!$setting || !$setting->enabled) {
                    $send('error', ['message' => 'チャットは現在無効です。']);
                    return;
                }

                $apiKey = config('services.gemini.api_key');
                if (!$apiKey) {
                    if (app()->environment('production')) {
                        \Log::error('AiChat(stream): GEMINI_API_KEY not set in production');
                        $send('error', ['message' => 'ただいまAIチャットをご利用いただけません。お手数ですがLINEから直接ご相談ください。']);
                        return;
                    }
                    // Dev fallback — stream a mock so the UI can be exercised offline.
                    $self->streamMock($send, $userMessage, $pageType, $storeId);
                    return;
                }

                $startTime = microtime(true);

                $self->streamAgentMode(
                    $send, $apiKey, $setting, $userMessage, $history,
                    $pageType, $storeId, $ip, $startTime, $userArea, $userId
                );
            } catch (\Throwable $e) {
                \Log::error('AiChat stream error', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                $send('error', [
                    'message' => 'ただいま混み合っております。少し時間を置いてから再度お試しください。',
                ]);
            }
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/event-stream; charset=utf-8',
            'Cache-Control' => 'no-cache, no-transform',
            'Connection' => 'keep-alive',
            // Tell nginx to skip its own buffering for this response.
            'X-Accel-Buffering' => 'no',
        ]);
    }


    /**
     * Agent mode streaming. Internally runs the existing function-calling loop
     * (no streamGenerateContent for the mid-loop turns), and emits SSE events
     * for tool progress + a "typewriter" effect for the final text.
     */
    private function streamAgentMode(
        callable $send,
        string $apiKey,
        AiChatSetting $setting,
        string $userMessage,
        array $history,
        string $pageType,
        ?int $storeId,
        string $ip,
        float $startTime,
        string $userArea,
        ?int $userId,
    ): void {
        $storeContext = $this->prompt->buildStoreContext($pageType, $storeId);
        $systemPrompt = $this->prompt->buildAgentSystemPrompt($setting, $storeContext, $userArea, $pageType);
        $geminiHistory = $this->prompt->buildGeminiHistory($history);

        $contents = [
            ...$geminiHistory,
            ['role' => 'user', 'parts' => [['text' => $userMessage]]],
        ];

        $totalInputTokens = 0;
        $totalOutputTokens = 0;
        $toolCalls = [];
        $maxIterations = 3;

        $send('status', ['label' => 'AIが考えています…']);

        for ($i = 0; $i < $maxIterations; $i++) {
            // クライアントが離脱していれば、これ以上 Gemini を呼ばずに打ち切る
            // (PHP-FPM ワーカー占有・トークン浪費を防ぐ)。
            if (connection_aborted()) {
                return;
            }

            $payload = [
                'system_instruction' => ['parts' => [['text' => $systemPrompt]]],
                'contents' => $contents,
                'tools' => [['functionDeclarations' => $this->tools->getDeclarations()]],
                'generationConfig' => ['temperature' => 0.4, 'maxOutputTokens' => 2048],
            ];

            $response = $this->gemini->generate($apiKey, $payload);
            $data = $response->json();
            $totalInputTokens += $data['usageMetadata']['promptTokenCount'] ?? 0;
            $totalOutputTokens += $data['usageMetadata']['candidatesTokenCount'] ?? 0;

            $candidate = $data['candidates'][0] ?? null;
            if (!$candidate) {
                throw new \Exception('No candidate in response');
            }
            $parts = $candidate['content']['parts'] ?? [];
            $functionCalls = array_filter($parts, fn($p) => isset($p['functionCall']));

            if (empty($functionCalls)) {
                // Final text reply — stream it as typewriter chunks.
                $aiText = collect($parts)->filter(fn($p) => isset($p['text']))->pluck('text')->implode('');
                $recommendedStores = $this->extractStoreIdsFromToolCalls($toolCalls, $aiText);
                $displayText = AgentTextSanitizer::strip($aiText, !empty($recommendedStores));

                $elapsed = round((microtime(true) - $startTime) * 1000);

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

                $this->streamTextAsTypewriter($send, $displayText);

                $send('done', [
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
                return;
            }

            // Function calls — show progress
            $contents[] = ['role' => 'model', 'parts' => $parts];
            $functionResponseParts = [];
            foreach ($functionCalls as $part) {
                $fc = $part['functionCall'];
                $toolName = $fc['name'];
                $toolArgs = $fc['args'] ?? [];

                $send('status', ['label' => $this->labelForTool($toolName, $toolArgs)]);

                $result = $this->tools->execute($toolName, $toolArgs);
                $toolCalls[] = ['name' => $toolName, 'args' => $toolArgs, 'result' => $result];

                if ($toolName === 'search_stores' && isset($result['stores'])) {
                    $send('status', ['label' => count($result['stores']) . '件の候補を見つけました']);
                }

                $functionResponseParts[] = [
                    'functionResponse' => ['name' => $toolName, 'response' => $result],
                ];
            }
            $contents[] = ['role' => 'user', 'parts' => $functionResponseParts];
        }

        // Max iterations reached. 非ストリーム版と同様、収集済みの店舗候補を捨てず、
        // それらを活かした正常な done を返す (LINE 誘導 CTA も表示される)。
        \Log::info('AiChat(stream): agent loop hit max iterations, returning collected stores', [
            'tool_calls' => count($toolCalls),
        ]);

        $recommendedStores = $this->extractStoreIdsFromToolCalls($toolCalls);
        $fallbackText = !empty($recommendedStores)
            ? 'ご希望に近いお店をいくつかご紹介します。気になるお店があれば、LINEから気軽にご相談くださいね。'
            : 'うまくお探しできませんでした。条件を変えて試すか、LINEから直接ご相談ください。スタッフが一緒にお店探しをお手伝いします。';
        $elapsed = round((microtime(true) - $startTime) * 1000);

        AiChatLog::create([
            'user_id' => $userId,
            'ip_address' => $ip,
            'page_type' => $pageType,
            'user_message' => $userMessage,
            'ai_response' => $fallbackText,
            'input_tokens' => $totalInputTokens,
            'output_tokens' => $totalOutputTokens,
            'mode' => 'agent',
        ]);

        $this->streamTextAsTypewriter($send, $fallbackText);
        $send('done', [
            'stores' => $recommendedStores,
            'follow_ups' => [],
            'meta' => [
                'mode' => 'agent',
                'input_tokens' => $totalInputTokens,
                'output_tokens' => $totalOutputTokens,
                'total_tokens' => $totalInputTokens + $totalOutputTokens,
                'response_ms' => $elapsed,
                'tool_calls' => count($toolCalls),
                'max_iterations_reached' => true,
            ],
        ]);
    }

    /**
     * Emit the AI text as small chunks so the client gets a typewriter feel.
     * Chunk size and delay are tuned for Japanese (multi-byte safe via mb_*).
     */
    private function streamTextAsTypewriter(callable $send, string $text): void
    {
        $len = mb_strlen($text);
        if ($len === 0) {
            return;
        }
        // ~12 chars per chunk, ~25ms apart — feels like real streaming
        // without overwhelming the SSE channel.
        $chunkSize = 12;
        $delayUs = 25_000;
        for ($i = 0; $i < $len; $i += $chunkSize) {
            // クライアントが離脱したらタイプライター送出を即停止 (無駄な sleep/CPU を防ぐ)。
            if (connection_aborted()) {
                return;
            }
            $delta = mb_substr($text, $i, $chunkSize);
            $send('text', ['delta' => $delta]);
            // Avoid sleeping on the very last chunk.
            if ($i + $chunkSize < $len) {
                usleep($delayUs);
            }
        }
    }

    /**
     * Mock SSE stream for local development without GEMINI_API_KEY.
     */
    private function streamMock(callable $send, string $userMessage, string $pageType, ?int $storeId): void
    {
        $send('status', ['label' => '（モック）店舗を検索しています…']);
        usleep(400_000);
        $this->streamTextAsTypewriter(
            $send,
            "（モック応答）「{$userMessage}」についてですね。\n\n本番ではGemini APIから具体的なお店候補をお答えします。"
        );
        $send('done', [
            'stores' => [],
            'follow_ups' => ['未経験OKのお店', '高時給のお店', '体入できるお店'],
            'meta' => [
                'mode' => 'agent',
                'model' => 'mock',
                'input_tokens' => 0,
                'output_tokens' => 0,
                'total_tokens' => 0,
                'response_ms' => 600,
                'tool_calls' => 0,
            ],
        ]);
    }

    private function labelForTool(string $toolName, array $args): string
    {
        return match ($toolName) {
            'search_stores' => '店舗を検索しています…',
            'get_store_detail' => '店舗の詳細を確認しています…',
            default => 'AIが情報を取得しています…',
        };
    }
}
