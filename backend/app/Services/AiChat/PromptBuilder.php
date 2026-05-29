<?php

namespace App\Services\AiChat;

use App\Models\AiChatSetting;
use App\Models\Store;
use Illuminate\Support\Facades\Cache;

/**
 * Gemini / OpenAI に渡す system prompt と関連コンテキストを構築する。
 *
 * Phase 2-1c で AiChatController から以下を切り出し:
 *   - buildOpenAiSystemPrompt: FT model 用 (短く、ルール再掲なし)
 *   - buildCoreSystemPrompt: Gemini fallback 用 (フル仕様)
 *   - buildAgentSystemPrompt: Function Calling 用 (tool first)
 *   - buildStoreContext: 詳細ページ用の単一店舗 context
 *   - buildPipeDelimitedStoreData: 全店舗パイプ区切り (Cache 600s)
 *   - getToneDescription / buildGeminiHistory: 補助
 *
 * Prompt は文字列なので副作用なし (Cache::remember 以外)。
 * テスト容易性のため public method で公開する。
 */
class PromptBuilder
{
    /**
     * FT (OpenAI fine-tuned) model 用 — tone/format/domain は学習済みなので短く。
     */
    public function buildOpenAiSystemPrompt(AiChatSetting $setting, string $storeContext, string $userArea = '', string $pageType = 'top'): string
    {
        $prompt = '';

        if ($pageType === 'detail' && $storeContext) {
            $prompt .= "{$storeContext}\n\n";
            $prompt .= "【詳細ページ】上記の店舗に関する質問に回答する。他店舗は紹介しない。\n\n";
        }

        if ($userArea) {
            $prompt .= "【ユーザーの現在地】{$userArea}付近。エリア指定がない場合はこの地域周辺を優先。\n\n";
        }

        if ($setting->system_prompt) {
            $prompt .= "【運営からの追加指示】\n{$setting->system_prompt}\n\n";
        }

        $prompt .= "店舗を紹介する時は必ず[STORE:ID]マーカーを付けること。LINE誘導CTAを回答の末尾に必ず付けること。";

        return $prompt;
    }

    /**
     * Gemini fallback / non-agent mode 用のフル prompt。
     * 全店舗データを pipe-delimited で埋め込む (Cache あり)。
     */
    public function buildCoreSystemPrompt(AiChatSetting $setting, string $storeContext, string $userArea = '', string $pageType = 'top'): string
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

        $store = Store::find($storeId);
        if (!$store) {
            return '';
        }

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
        // 体入時給は最低/最高の2枠。旧データ (hourly 単一) もフォールバック。
        // プロンプトには 1 値だけ載せれば十分なので最低額を優先。
        $trialHourly = $trial['hourly_min']
            ?? $trial['avg_hourly']
            ?? $trial['hourly_max']
            ?? $trial['hourly']
            ?? '';

        $tags = implode(', ', $store->feature_tags ?? []);
        $backs = collect($compensation['back'] ?? [])
            ->map(fn ($b) => ($b['label'] ?? '') . ':' . ($b['amount'] ?? ''))
            ->filter(fn ($b) => $b !== ':')
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

    /**
     * 全店舗データをパイプ区切りで build (Cache 600s)。
     * Format: ID|店名|エリア|...|説明
     */
    public function buildPipeDelimitedStoreData(): string
    {
        return Cache::remember('public_stores_pipe_v3', 600, function () {
            $stores = Store::where('publish_status', 'published')->get();

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
                    $s->id, $s->name, $s->area, $s->nearest_station ?? '',
                    $s->category ?? '',
                    $regular['min'] ?? '', $regular['max'] ?? '',
                    $schedule['open']  ?? '', $schedule['close'] ?? '',
                    $payroll, $trial, $guaranteeStr, $norma, $rank,
                    $waiwai, $loose, $dressCodeStr, $transfer, $tags, $desc,
                ]);
            }

            return implode("\n", $lines);
        });
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
