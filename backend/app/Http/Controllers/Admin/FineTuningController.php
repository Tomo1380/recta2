<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
class FineTuningController extends Controller
{
    /**
     * Get current fine-tuning status and info
     */
    public function status(): JsonResponse
    {
        $setting = \App\Models\AiChatSetting::first();
        $openaiKey = config('services.openai.api_key');
        $currentModel = trim($setting->openai_finetuned_model ?? '') ?: null;

        // Check if training data file exists
        $filePath = storage_path('app/training_data_openai.jsonl');
        $trainingDataExists = file_exists($filePath);
        $trainingDataSize = $trainingDataExists ? filesize($filePath) : 0;

        // Count training pairs
        $trainingPairCount = 0;
        if ($trainingDataExists) {
            $fp = fopen($filePath, 'r');
            while (fgets($fp) !== false) {
                $trainingPairCount++;
            }
            fclose($fp);
        }

        return response()->json([
            'openai_configured' => !empty($openaiKey),
            'current_model' => $currentModel,
            'training_data_exists' => $trainingDataExists,
            'training_data_size' => $trainingDataSize,
            'training_pair_count' => $trainingPairCount,
            'store_count' => Store::where('publish_status', 'published')->count(),
        ]);
    }

    /**
     * Generate training data from current DB
     */
    public function generateTrainingData(): JsonResponse
    {
        try {
            // Generate Gemini format first
            $geminiOutput = storage_path('app/training_data.jsonl');
            Artisan::call('ai:generate-training-data', [
                '--output' => $geminiOutput,
            ]);

            // Convert to OpenAI ChatML format
            $openaiOutput = storage_path('app/training_data_openai.jsonl');
            $this->convertToOpenAiFormat($geminiOutput, $openaiOutput);

            // Count pairs
            $pairCount = 0;
            $fp = fopen($openaiOutput, 'r');
            while (fgets($fp) !== false) {
                $pairCount++;
            }
            fclose($fp);

            $size = filesize($openaiOutput);

            return response()->json([
                'success' => true,
                'pair_count' => $pairCount,
                'file_size' => $size,
                'message' => "{$pairCount}件の訓練データを生成しました",
            ]);
        } catch (\Exception $e) {
            Log::error('Fine-tuning data generation failed', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => '訓練データの生成に失敗しました: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload training data to OpenAI and start fine-tuning job
     */
    public function startTraining(Request $request): JsonResponse
    {
        $setting = \App\Models\AiChatSetting::first();
        $openaiKey = trim(config('services.openai.api_key') ?? '');
        if (empty($openaiKey)) {
            return response()->json([
                'success' => false,
                'message' => 'OpenAI APIキーが設定されていません',
            ], 422);
        }

        $filePath = storage_path('app/training_data_openai.jsonl');
        if (!file_exists($filePath)) {
            return response()->json([
                'success' => false,
                'message' => '訓練データがありません。先にデータを生成してください。',
            ], 422);
        }

        try {
            // Step 1: Upload file to OpenAI
            $uploadResponse = Http::withHeaders([
                'Authorization' => "Bearer {$openaiKey}",
            ])->attach(
                'file',
                file_get_contents($filePath),
                'training_data_openai.jsonl'
            )->post('https://api.openai.com/v1/files', [
                'purpose' => 'fine-tune',
            ]);

            if (!$uploadResponse->successful()) {
                Log::error('OpenAI file upload failed', ['response' => $uploadResponse->body()]);
                return response()->json([
                    'success' => false,
                    'message' => 'ファイルアップロードに失敗しました: ' . $uploadResponse->json('error.message', $uploadResponse->body()),
                ], 500);
            }

            $fileId = $uploadResponse->json('id');
            Log::info('OpenAI file uploaded', ['file_id' => $fileId]);

            // Step 2: Start fine-tuning job
            $baseModel = $request->input('base_model', 'gpt-4o-mini-2024-07-18');
            $suffix = $request->input('suffix', 'recta-advisor');
            $epochs = $request->input('epochs', 3);

            $ftResponse = Http::withHeaders([
                'Authorization' => "Bearer {$openaiKey}",
                'Content-Type' => 'application/json',
            ])->post('https://api.openai.com/v1/fine_tuning/jobs', [
                'training_file' => $fileId,
                'model' => $baseModel,
                'suffix' => $suffix,
                'hyperparameters' => [
                    'n_epochs' => (int) $epochs,
                ],
            ]);

            if (!$ftResponse->successful()) {
                Log::error('OpenAI fine-tuning job creation failed', ['response' => $ftResponse->body()]);
                return response()->json([
                    'success' => false,
                    'message' => 'Fine-tuningジョブの作成に失敗しました: ' . $ftResponse->json('error.message', $ftResponse->body()),
                ], 500);
            }

            $jobData = $ftResponse->json();
            Log::info('OpenAI fine-tuning job created', ['job_id' => $jobData['id']]);

            return response()->json([
                'success' => true,
                'job_id' => $jobData['id'],
                'status' => $jobData['status'],
                'model' => $jobData['model'],
                'message' => 'Fine-tuningジョブを開始しました。完了まで15〜30分かかります。',
            ]);
        } catch (\Exception $e) {
            Log::error('Fine-tuning start failed', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Fine-tuningの開始に失敗しました: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check fine-tuning job status
     */
    public function jobStatus(Request $request): JsonResponse
    {
        $setting = \App\Models\AiChatSetting::first();
        $openaiKey = trim(config('services.openai.api_key') ?? '');
        if (empty($openaiKey)) {
            return response()->json([
                'success' => false,
                'message' => 'OpenAI APIキーが設定されていません',
            ], 422);
        }

        $jobId = $request->input('job_id');
        if (empty($jobId)) {
            // List recent jobs
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$openaiKey}",
            ])->get('https://api.openai.com/v1/fine_tuning/jobs', [
                'limit' => 5,
            ]);

            if (!$response->successful()) {
                return response()->json([
                    'success' => false,
                    'message' => 'ジョブ一覧の取得に失敗しました',
                ], 500);
            }

            return response()->json([
                'success' => true,
                'jobs' => $response->json('data'),
            ]);
        }

        // Get specific job
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$openaiKey}",
        ])->get("https://api.openai.com/v1/fine_tuning/jobs/{$jobId}");

        if (!$response->successful()) {
            return response()->json([
                'success' => false,
                'message' => 'ジョブ情報の取得に失敗しました',
            ], 500);
        }

        $job = $response->json();

        return response()->json([
            'success' => true,
            'job' => $job,
            'fine_tuned_model' => $job['fine_tuned_model'] ?? null,
            'status' => $job['status'],
        ]);
    }

    /**
     * Update the active fine-tuned model ID (stored in DB)
     */
    public function updateModel(Request $request): JsonResponse
    {
        $request->validate([
            'model_id' => 'required|string',
        ]);

        $modelId = $request->input('model_id');

        // Save to all ai_chat_settings rows
        \App\Models\AiChatSetting::query()->update(['openai_finetuned_model' => $modelId]);

        return response()->json([
            'success' => true,
            'model_id' => $modelId,
            'message' => "モデルを {$modelId} に更新しました",
        ]);
    }

    /**
     * Get training data pairs for preview/edit
     */
    public function trainingData(): JsonResponse
    {
        $filePath = storage_path('app/training_data_openai.jsonl');
        if (!file_exists($filePath)) {
            return response()->json(['pairs' => []]);
        }

        $pairs = [];
        $fp = fopen($filePath, 'r');
        $index = 0;
        while (($line = fgets($fp)) !== false) {
            $data = json_decode(trim($line), true);
            if (!$data || !isset($data['messages'])) {
                continue;
            }

            $user = '';
            $assistant = '';
            foreach ($data['messages'] as $msg) {
                if ($msg['role'] === 'user') {
                    $user = $msg['content'];
                } elseif ($msg['role'] === 'assistant') {
                    $assistant = $msg['content'];
                }
            }

            $pairs[] = [
                'index' => $index,
                'user' => $user,
                'assistant' => $assistant,
            ];
            $index++;
        }
        fclose($fp);

        return response()->json(['pairs' => $pairs]);
    }

    /**
     * Update a single training pair
     */
    public function updateTrainingPair(Request $request): JsonResponse
    {
        $request->validate([
            'index' => 'required|integer|min:0',
            'user' => 'required|string',
            'assistant' => 'required|string',
        ]);

        $filePath = storage_path('app/training_data_openai.jsonl');
        if (!file_exists($filePath)) {
            return response()->json(['success' => false, 'message' => '訓練データがありません'], 404);
        }

        $targetIndex = $request->input('index');
        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        if ($targetIndex >= count($lines)) {
            return response()->json(['success' => false, 'message' => 'インデックスが範囲外です'], 422);
        }

        $data = json_decode($lines[$targetIndex], true);
        if (!$data || !isset($data['messages'])) {
            return response()->json(['success' => false, 'message' => 'データの解析に失敗しました'], 422);
        }

        // Update user and assistant messages (keep system message intact)
        foreach ($data['messages'] as &$msg) {
            if ($msg['role'] === 'user') {
                $msg['content'] = $request->input('user');
            } elseif ($msg['role'] === 'assistant') {
                $msg['content'] = $request->input('assistant');
            }
        }
        unset($msg);

        $lines[$targetIndex] = json_encode($data, JSON_UNESCAPED_UNICODE);
        file_put_contents($filePath, implode("\n", $lines) . "\n");

        return response()->json(['success' => true, 'message' => '更新しました']);
    }

    /**
     * Delete a training pair
     */
    public function deleteTrainingPair(int $index): JsonResponse
    {
        $filePath = storage_path('app/training_data_openai.jsonl');
        if (!file_exists($filePath)) {
            return response()->json(['success' => false, 'message' => '訓練データがありません'], 404);
        }

        $targetIndex = $index;
        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        if ($targetIndex >= count($lines)) {
            return response()->json(['success' => false, 'message' => 'インデックスが範囲外です'], 422);
        }

        array_splice($lines, $targetIndex, 1);
        file_put_contents($filePath, count($lines) > 0 ? implode("\n", $lines) . "\n" : '');

        return response()->json(['success' => true, 'message' => '削除しました', 'remaining' => count($lines)]);
    }

    /**
     * Add a new training pair
     */
    public function addTrainingPair(Request $request): JsonResponse
    {
        $request->validate([
            'user' => 'required|string',
            'assistant' => 'required|string',
        ]);

        $filePath = storage_path('app/training_data_openai.jsonl');
        $systemPrompt = $this->buildTrainingSystemPrompt();

        $data = [
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $request->input('user')],
                ['role' => 'assistant', 'content' => $request->input('assistant')],
            ],
        ];

        file_put_contents($filePath, json_encode($data, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND);

        // Count total
        $count = 0;
        $fp = fopen($filePath, 'r');
        while (fgets($fp) !== false) {
            $count++;
        }
        fclose($fp);

        return response()->json(['success' => true, 'message' => '追加しました', 'total' => $count]);
    }

    /**
     * Convert Gemini JSONL format to OpenAI ChatML format
     */
    /**
     * Build the system prompt for fine-tuning training data.
     * No store data — the FT model learns store knowledge from training pairs directly.
     * System prompt only controls tone, format, and page-type behavior.
     */
    private function buildTrainingSystemPrompt(): string
    {
        $prompt = "あなたは「Recta AI」、ナイトワーク（キャバクラ・ラウンジ・ガールズバー・コンカフェ）専門のキャリアアドバイザーです。\n\n"
            . "【回答ルール】\n"
            . "- 求職者に寄り添い、親しみやすく丁寧に回答する\n"
            . "- 店舗を紹介する際は [STORE:店舗ID] マーカーを必ず店名の前に付ける（例: [STORE:1]【Club Lumière】）\n"
            . "- 1回の回答で2〜3店舗を紹介する（5件以上の羅列はNG）\n"
            . "- ユーザーに質問を返さない（条件が曖昧でも推測して店舗を選ぶ）\n"
            . "- ナイトワーク以外の質問は丁寧にお断り\n"
            . "- 下記の店舗データから情報を読み取って回答すること。データにない店舗を紹介してはいけない\n"
            . "- 300〜500文字程度で簡潔に\n\n"
            . "【雰囲気の解釈】\n"
            . "「わいわい系」→アットホーム・明るい雰囲気の店\n"
            . "「落ち着いた」→高級・会員制\n"
            . "「ゆるい」→ノルマなし・自由シフト\n\n"
            . "【ページ別の振る舞い】\n"
            . "- トップページ: 幅広い提案。エリアやカテゴリの希望がなければ人気店から紹介\n"
            . "- 店舗一覧ページ: 条件を絞り込む手伝い。エリア・カテゴリ・タグで提案\n"
            . "- 店舗詳細ページ: その店舗のみについて回答。他店舗は紹介しない\n\n";

        // Include full store data so the FT model learns to read from it
        $prompt .= "【全店舗データ】\n";
        $prompt .= $this->getStoreJson();
        $prompt .= "\n";

        return $prompt;
    }

    private function getStoreJson(): string
    {
        return Cache::remember('public_stores_full_json_v1', 600, function () {
            $stores = Store::where('publish_status', 'published')
                ->get()
                ->map(function ($s) {
                    $data = [
                        'id' => $s->id,
                        'name' => $s->name,
                        'area' => $s->area,
                        'category' => $s->category,
                        'nearest_station' => $s->nearest_station,
                        'business_hours' => $s->business_hours,
                        'hourly_min' => $s->hourly_min,
                        'hourly_max' => $s->hourly_max,
                        'daily_estimate' => $s->daily_estimate,
                        'same_day_trial' => $s->same_day_trial,
                        'trial_hourly' => $s->trial_hourly,
                        'guarantee_period' => $s->guarantee_period,
                        'norma_info' => $s->norma_info,
                        'feature_tags' => $s->feature_tags ?? [],
                        'back_items' => collect($s->back_items ?? [])->map(fn($b) => ($b['label'] ?? '') . ':' . ($b['amount'] ?? ''))->filter(fn($b) => $b !== ':')->values()->toArray(),
                        'description' => $s->description,
                        'features_text' => $s->features_text,
                        'staff_comment' => $s->staff_comment,
                    ];
                    return array_filter($data, fn($v) => $v !== null && $v !== '' && $v !== []);
                })
                ->values()
                ->toArray();
            return json_encode($stores, JSON_UNESCAPED_UNICODE);
        });
    }

    private function convertToOpenAiFormat(string $geminiPath, string $openaiPath): void
    {
        $systemPrompt = $this->buildTrainingSystemPrompt();

        $fp = fopen($geminiPath, 'r');
        $out = fopen($openaiPath, 'w');

        while (($line = fgets($fp)) !== false) {
            $data = json_decode(trim($line), true);
            if (!$data || !isset($data['contents'])) {
                continue;
            }

            $messages = [
                ['role' => 'system', 'content' => $systemPrompt],
            ];

            foreach ($data['contents'] as $turn) {
                $role = $turn['role'] === 'user' ? 'user' : 'assistant';
                $text = $turn['parts'][0]['text'] ?? '';
                $messages[] = ['role' => $role, 'content' => $text];
            }

            fwrite($out, json_encode(['messages' => $messages], JSON_UNESCAPED_UNICODE) . "\n");
        }

        fclose($fp);
        fclose($out);
    }
}
