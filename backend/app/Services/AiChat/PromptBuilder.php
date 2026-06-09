<?php

namespace App\Services\AiChat;

use App\Models\AiChatSetting;
use App\Models\Store;

/**
 * Gemini agent mode に渡す system prompt と関連コンテキストを構築する。
 *
 *   - buildAgentSystemPrompt: Function Calling 用 (tool first / lean)
 *   - buildStoreContext: 詳細ページ用の単一店舗 context
 *   - getToneDescription / buildGeminiHistory: 補助
 *
 * Prompt は文字列なので副作用なし。テスト容易性のため public method で公開する。
 */
class PromptBuilder
{
    /**
     * Agent mode (Function Calling) 用 — lean。ストアデータは入れず、tool 経由で取得させる。
     */
    public function buildAgentSystemPrompt(AiChatSetting $setting, string $storeContext, string $userArea = '', string $pageType = 'top'): string
    {
        $toneDesc = $this->getToneDescription($setting->tone);

        $prompt = "【ペルソナ】\n" .
            "あなたは「Recta AI（採用アシスタントAI）」です。ナイトワーク業界（キャバクラ・ラウンジ・ガールズバー・コンカフェ・クラブ）の求人に詳しい、フレンドリーなキャリアアドバイザーです。\n" .
            "口調: {$toneDesc}\n" .
            "一人称は使わない。絵文字は使わない。日本語のみで回答する。\n\n";

        $prompt .=
            "【絶対厳守・店舗情報のハルシネーション禁止】\n" .
            "- 店舗名・時給・エリア・最寄り駅・特徴などの具体的な店舗情報は、search_stores（詳細ページでは提示済みの店舗データ）から取得した実データのみを書く。\n" .
            "- search_stores を呼んでいないのに具体的な店舗名や時給を文章に書くことは固く禁止する。実在しない店舗を絶対に創作しない。\n" .
            "- 店舗を勧めたいときは必ず先に search_stores を呼ぶ。検索しない/結果が無い場合は店舗名を一切出さず、『ご希望の条件（エリア・時給・働き方など）を教えていただければお店をお探しします』と案内する。\n" .
            "- 業界用語の解説や不安への回答に店舗紹介を“おまけ”で付け足す場合も、このルールを必ず守る（search_stores を呼ばずに店名・時給を書かない）。\n" .
            "- 『〜のお店をピックアップしました／ご紹介します／おすすめです』のように店舗を列挙する文章を書くなら、その直前に必ず search_stores を呼ぶこと。検索していないのに店舗を列挙するのは禁止。\n" .
            "- LINEのURL・友だち追加リンク・LINE ID を本文に書かない。LINE誘導は定型文『もっと詳しく知りたい方は、LINEで担当者に直接相談できます！』のみとし、URL や ID は書かない（リンクはアプリ側が表示する）。\n\n";

        if ($setting->system_prompt) {
            $prompt .= "【運営からの追加指示】\n{$setting->system_prompt}\n\n";
        }

        if ($userArea) {
            $prompt .= "【ユーザーの現在地】{$userArea}付近。エリア指定がない場合はこの地域周辺を優先。\n\n";
        }

        if ($pageType === 'detail' && $storeContext) {
            $prompt .= "{$storeContext}\n\n";
            $prompt .=
                "【詳細ページのルール】\n" .
                "- この店舗に関する質問に直接回答する。他店舗を検索・紹介しない\n" .
                "- 業界用語の質問（体入・ノルマ・バック等）にはget_industry_knowledgeを呼び出す\n" .
                "- 店舗データに記載のない情報は「詳しくはLINEで担当者にご確認ください」と案内する\n\n";
        } else {
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
            "  ・[STORE:ID] 店名（エリア/最寄り駅）体入時給○,○○○円〜\n" .
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
            "- 時給に幅がある場合は「○,○○○〜○,○○○円」と書く。末尾に余分な「〜」を付けない（「3,000円〜9,500円〜」のような重複は禁止）\n" .
            "- バック率・日給は「目安」と添える\n" .
            "- 保証期間がある場合は積極的に言及する（安心材料）\n";

        return $prompt;
    }

    /**
     * 詳細ページの単一店舗 context (詳細ページ以外では空文字を返す)。
     */
    public function buildStoreContext(string $pageType, ?int $storeId): string
    {
        if (!($pageType === 'detail' && $storeId)) {
            return '';
        }

        // 公開店舗のみ context に含める。下書き/非公開店舗の詳細ページが
        // 何らかの経路で開かれても、未公開情報を AI が漏らさないようにする。
        $store = Store::where('publish_status', 'published')->find($storeId);
        if (!$store) {
            return '';
        }

        $schedule    = is_array($store->schedule)     ? $store->schedule     : [];
        $wage        = is_array($store->wage)         ? $store->wage         : [];
        $compensation= is_array($store->compensation) ? $store->compensation : [];
        $guarantee   = is_array($store->guarantee)    ? $store->guarantee    : [];
        $trial       = $wage['trial']   ?? [];

        // 通常時給は廃止。給与は体入時給に一本化 (旧キーはフォールバック)。
        $hourlyMin = $trial['hourly_min'] ?? $trial['avg_hourly'] ?? '';
        $hourlyMax = $trial['hourly_max'] ?? $trial['hourly'] ?? '';
        $businessHours = $schedule['hours_text'] ?? '';
        $holidays = $schedule['holidays'] ?? '';
        $dailyEstimate = $wage['daily_estimate'] ?? null;
        $norma = $guarantee['norma'] ?? null;
        $guaranteePeriod = $guarantee['period'] ?? null;
        $guaranteeDetails = $guarantee['details'] ?? '';
        // same_day_trial は enum string ('same_day' | 'normal' | 'none')。
        // 旧 boolean ではなくなったため (bool) キャスト禁止 ('none' が真になる)。
        $trialType = $guarantee['same_day_trial'] ?? 'none';
        // 体入時給は最低/最高の2枠。旧データ (hourly 単一) もフォールバック。
        // プロンプトには 1 値だけ載せれば十分なので最低額を優先。
        $trialHourly = $trial['hourly_min']
            ?? $trial['avg_hourly']
            ?? $trial['hourly_max']
            ?? $trial['hourly']
            ?? '';

        $tags = implode(', ', $store->feature_tags ?? []);
        // back item は新 shape {label, value, unit}。旧 'amount' もフォールバック。
        $backs = collect($compensation['back'] ?? [])
            ->map(fn ($b) => ($b['label'] ?? '') . ':' . ($b['value'] ?? $b['amount'] ?? ''))
            ->filter(fn ($b) => $b !== ':')
            ->implode(', ');

        $context = "【現在閲覧中の店舗】\n" .
            "店名: {$store->name}\n" .
            "エリア: {$store->area}（{$store->nearest_station}）\n" .
            "カテゴリ: {$store->category}\n" .
            "体入時給: {$hourlyMin}〜{$hourlyMax}円\n" .
            "営業時間: {$businessHours}\n" .
            "定休日: {$holidays}\n";

        if ($dailyEstimate) $context .= "日給目安: {$dailyEstimate}\n";
        if ($backs) $context .= "バック: {$backs}\n";
        if ($norma) $context .= "ノルマ: {$norma}\n";
        if ($guaranteePeriod) $context .= "保証: {$guaranteePeriod} {$guaranteeDetails}\n";
        if ($trialType === 'same_day') $context .= "体入確約: OK（体入時給: {$trialHourly}）\n";
        elseif ($trialType === 'normal') $context .= "体入: 可能（体入時給: {$trialHourly}）\n";
        if ($tags) $context .= "特徴: {$tags}\n";
        $context .= "説明: {$store->description}\n";
        if ($store->features_text) $context .= "詳細特徴: {$store->features_text}\n";

        return $context;
    }

    public function getToneDescription(string $tone): string
    {
        return match ($tone) {
            'casual' => 'カジュアルで親しみやすい口調',
            'formal' => '丁寧でフォーマルな口調',
            default => 'フレンドリーで温かみのある口調',
        };
    }

    /**
     * フロントから送られる history を Gemini 形式に変換。
     *
     * @param  array<int, array<string, mixed>>  $history
     * @return array<int, array{role: string, parts: array<int, array{text: string}>}>
     */
    public function buildGeminiHistory(array $history): array
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
}
