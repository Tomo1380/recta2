# AIチャット アーキテクチャ

## システム概要

```
ブラウザ (AiChatPanel)
    │
    ├─ GET  /api/chat/config     → 設定・サジェストボタン取得
    └─ POST /api/chat            → チャットメッセージ送信
           │
           ▼
    AiChatController::chat()
           │
           ├─ 利用制限チェック (checkUsageLimits)
           │
           ├─→ Agent mode ──→ Gemini API (Function Calling)
           │                      │
           │                      └─ ツールループ (max 5回)
           │                           ├─ search_stores → PostgreSQL
           │                           ├─ get_store_detail → PostgreSQL
           │                           ├─ get_areas → PostgreSQL
           │                           └─ get_categories → PostgreSQL
           │
           └─→ Finetuned mode
                  │
                  ├─ OpenAI設定あり → OpenAI API (ft:gpt-4o-mini)
                  └─ OpenAI設定なし → Gemini API (プロンプト埋め込み)
```

---

## シーケンス図

### 1. 初期化フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant FE as AiChatPanel
    participant GEO as Nominatim API
    participant API as Laravel API

    U->>FE: ページ表示
    FE->>API: GET /api/chat/config?page_type=top
    API-->>FE: { enabled, suggest_buttons[] }

    FE->>FE: Geolocation API (ブラウザ)
    FE->>GEO: 逆ジオコーディング (緯度,経度)
    GEO-->>FE: エリア名 (例: "渋谷区")

    FE->>FE: イントロアニメーション表示
    FE->>FE: サジェストボタン表示
```

### 2. Agent mode (メインフロー)

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant FE as AiChatPanel
    participant API as AiChatController
    participant LIM as AiChatLimit
    participant GEM as Gemini API
    participant DB as PostgreSQL

    U->>FE: メッセージ入力 or サジェストクリック
    FE->>FE: ユーザーメッセージをチャットに追加
    FE->>API: POST /api/chat
    Note right of FE: { message, page_type, mode:"agent",<br/>store_id, history[], user_area }

    API->>LIM: checkUsageLimits()
    alt 制限超過
        LIM-->>API: 429 Too Many Requests
        API-->>FE: { message, limit_type }
        FE->>FE: 制限メッセージ表示
    end

    API->>API: buildAgentSystemPrompt()
    API->>API: buildGeminiHistory(history)
    API->>API: getToolDeclarations()

    loop ツールループ (max 5回)
        API->>GEM: POST generateContent
        Note right of API: system_instruction + contents<br/>+ tools + generationConfig<br/>(temp:0.4, maxTokens:2048)

        GEM-->>API: レスポンス

        alt functionCall あり
            API->>API: executeTool()
            alt search_stores
                API->>DB: Store::where(filters)->get()
                DB-->>API: 店舗一覧
            else get_store_detail
                API->>DB: Store::find(id)
                DB-->>API: 店舗詳細
            else get_areas / get_categories
                API->>DB: Area::all() / Category::all()
                DB-->>API: エリア/カテゴリ一覧
            end
            API->>API: ツール結果をcontentsに追加
        else テキスト応答のみ
            API->>API: ループ終了
        end
    end

    API->>DB: AiChatLog::create() (ログ保存)
    API->>API: extractStoreIdsFromToolCalls()
    API->>API: generateFollowUps()
    API-->>FE: { message, stores[], follow_ups[], meta }

    FE->>FE: AIメッセージ表示
    FE->>FE: 店舗カード表示 (max 3枚)
    FE->>FE: LINE CTA表示
    FE->>FE: フォローアップチップ表示
```

### 3. Finetuned mode (OpenAI)

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant FE as AiChatPanel
    participant API as AiChatController
    participant OAI as OpenAI API
    participant DB as PostgreSQL

    U->>FE: メッセージ入力
    FE->>API: POST /api/chat
    Note right of FE: { message, mode:"finetuned", ... }

    API->>API: checkUsageLimits()
    API->>API: buildOpenAiSystemPrompt()
    Note right of API: 軽量プロンプト<br/>(店舗データ不要、<br/>モデルが学習済み)

    API->>OAI: POST /v1/chat/completions
    Note right of API: model: ft:gpt-4o-mini:recta-advisor<br/>messages: [system, ...history, user]<br/>temperature: 0.4

    OAI-->>API: { choices[0].message.content }

    API->>API: extractStoreRecommendations(aiText)
    Note right of API: [STORE:ID] マーカーを<br/>正規表現で抽出
    API->>DB: Store::whereIn(ids)->get()
    API->>API: preg_replace で [STORE:ID] 除去
    API->>DB: AiChatLog::create()
    API->>API: generateFollowUps()

    API-->>FE: { message, stores[], follow_ups[], meta }
    FE->>FE: 通常と同じUI表示
```

### 4. Finetuned mode フォールバック (Gemini)

```mermaid
sequenceDiagram
    participant API as AiChatController
    participant GEM as Gemini API
    participant DB as PostgreSQL

    Note over API: OpenAI未設定時

    API->>DB: Store::all() → 全店舗データ取得
    Note right of API: Cache 10分 (key: public_stores_summary_v2)
    API->>API: buildSystemPrompt()
    Note right of API: 全店舗データを<br/>システムプロンプトに埋め込み<br/>(トークン大)

    API->>GEM: POST generateContent
    Note right of API: ツールなし<br/>temp:0.5, maxTokens:2048

    GEM-->>API: テキスト応答 ([STORE:ID]マーカー含む)
    API->>API: extractStoreRecommendations()
    API->>API: [STORE:ID] strip → 表示用テキスト
```

---

## 利用制限

```
┌─────────────────┬───────────┬───────────────────────┐
│ 制限タイプ       │ デフォルト │ 対象                   │
├─────────────────┼───────────┼───────────────────────┤
│ global_daily    │ 10,000/日  │ 全ユーザー合計          │
│ user_daily      │ 50/日      │ 認証済みユーザー        │
│ user_monthly    │ 500/月     │ 認証済みユーザー        │
│ ip_daily        │ 10/日      │ 未認証ユーザー (IP単位)  │
└─────────────────┴───────────┴───────────────────────┘
```

---

## ツール定義 (Agent mode)

| ツール名 | 説明 | 主要パラメータ |
|---------|------|--------------|
| `search_stores` | 条件検索 | area, category, min_hourly, max_hourly, tags[], nearest_station, same_day_trial, has_guarantee, keyword, sort, limit |
| `get_store_detail` | 店舗詳細 | store_id |
| `get_areas` | エリア一覧 | なし |
| `get_categories` | カテゴリ一覧 | なし |

---

## フォローアップ生成ロジック

```
入力: userMessage + aiResponse + pageType
    │
    ├─ detail ページ → 固定サジェスト
    │   └─ [体入の流れ, バック・保証の詳細, 実際の雰囲気]
    │
    └─ その他 → 文脈分析
        ├─ 既出トピック検出: area, salary, beginner, trial, norma, guarantee
        ├─ 未出トピックからサジェスト生成
        └─ フォールバック: [未経験OKのお店, 高時給のお店, 体入できるお店]

出力: max 3件の提案テキスト
```

---

## APIレスポンス形式

```json
{
  "message": "AIの回答テキスト",
  "stores": [
    {
      "id": 1,
      "name": "Club Lumière",
      "area": "六本木",
      "nearest_station": "六本木駅",
      "hourly_min": 4000,
      "hourly_max": 8000,
      "description": "...",
      "images": [{"url": "...", "order": 1}]
    }
  ],
  "follow_ups": ["体入できるお店", "ノルマなしのお店"],
  "meta": {
    "mode": "agent",
    "model": "gemini-3.1-flash-lite-preview",
    "input_tokens": 1234,
    "output_tokens": 567,
    "total_tokens": 1801,
    "response_ms": 2340,
    "tool_calls": 2
  }
}
```

---

## プロンプト構成詳細

### 全体構造

各モードのプロンプトは **固定部分（コード内ハードコード）** と **可変部分（管理画面 or 実行時データ）** で構成される。

```
システムプロンプト = 固定ペルソナ + 管理画面プロンプト + ユーザー現在地 + 店舗コンテキスト + 固定ルール群
```

---

### 1. Agent mode プロンプト (`buildAgentSystemPrompt`)

Gemini API の `system_instruction` として送信される。

```
┌──────────────────────────────────────────────────────────────────┐
│ 【ペルソナ】                                           ← 固定値 │
│ あなたは「Recta AI」です。ナイトワーク業界（キャバクラ・           │
│ ラウンジ・ガールズバー・コンカフェ・クラブ）の求人に詳しい、       │
│ フレンドリーなキャリアアドバイザーです。                            │
│ 求人マッチングプラットフォーム「Recta」の公式AIアシスタント         │
│ として、求職者の不安を解消し、最適なお店選びをサポートします。      │
│ 口調: {toneDesc}                              ← 管理画面で設定 │
│ 一人称は使わない。「おすすめは〜」「ご紹介します」のような          │
│ 表現を使う。                                                      │
├──────────────────────────────────────────────────────────────────┤
│ 【運営からの追加指示】                         ← 管理画面で編集 │
│ {setting.system_prompt}                                          │
│ ※ 管理画面 > AIチャット設定 > プロンプトタブで各ページ別に設定    │
│ ※ 空の場合はこのセクション自体が省略される                         │
├──────────────────────────────────────────────────────────────────┤
│ 【現在の文脈】                               ← 店舗詳細ページ時 │
│ {storeContext}                                                    │
│ ※ page_type=detail の場合のみ。閲覧中の店舗情報を展開             │
│ ※ 店名、エリア、時給、バック、ノルマ、保証、体入、特徴等           │
│ ※ top/list ページでは省略                                         │
├──────────────────────────────────────────────────────────────────┤
│ 【ユーザーの現在地】                      ← ブラウザGeolocation │
│ {userArea}付近にいます。エリア指定がない質問の場合、               │
│ この地域周辺のお店を優先的に紹介してください。                     │
│ ※ Geolocation許可時のみ。未許可なら省略                           │
├──────────────────────────────────────────────────────────────────┤
│ 【絶対ルール】                                         ← 固定値 │
│ 1. ユーザーに質問を返してはいけない（条件が曖昧でも推測して        │
│    search_storesを呼び出す）                                      │
│ 2. 必ずsearch_storesツールを呼び出して実データから回答する         │
│ 3. 検索結果から2〜3件を厳選して紹介する（5件以上の羅列はNG）       │
│ 4. 絵文字は使わない                                               │
│ 5. 日本語のみで回答する                                           │
├──────────────────────────────────────────────────────────────────┤
│ 【検索のコツ】                                         ← 固定値 │
│ - 「初めて」「初心者」→ tags: ["未経験歓迎"]                      │
│ - 「稼ぎたい」→ sort: "hourly_desc"                               │
│ - 「体入」→ same_day_trial: true                                  │
│ - 「ノルマない」→ tags: ["ノルマなし"]                             │
│ - エリア不明 + 現在地あり → 現在地周辺で検索                      │
│ - 比較質問 → get_store_detailを2回呼んで比較                      │
│ - 条件が多い場合は重要な2〜3個に絞る                               │
├──────────────────────────────────────────────────────────────────┤
│ 【給与・待遇に関する回答】                             ← 固定値 │
│ - 時給は「○,○○○円〜」形式、確定値のように書かない                │
│ - バック率や日給は「目安」注釈を付ける                             │
│ - 保証期間・体入の有無も重要情報として紹介                         │
├──────────────────────────────────────────────────────────────────┤
│ 【検索結果0件の場合】                                  ← 固定値 │
│ - 正直に伝える → 条件を緩めて代替検索を自動実行                   │
├──────────────────────────────────────────────────────────────────┤
│ 【ナイトワーク以外の質問】                             ← 固定値 │
│ - 丁寧にお断り（search_storesは呼ばなくてOK）                     │
├──────────────────────────────────────────────────────────────────┤
│ 【センシティブな話題】                                 ← 固定値 │
│ - 違法行為には応じない、LINE誘導、個人情報は扱わない               │
├──────────────────────────────────────────────────────────────────┤
│ 【回答の長さ】                                         ← 固定値 │
│ - 1店舗あたり1〜2行、全体300〜500文字目安                         │
├──────────────────────────────────────────────────────────────────┤
│ 【回答フォーマット】                                   ← 固定値 │
│ ・店名（エリア/最寄り駅）時給○,○○○円〜                          │
│   [1行で特徴やおすすめポイント]                                    │
├──────────────────────────────────────────────────────────────────┤
│ 【LINE誘導】                                           ← 固定値 │
│ 回答の最後に必ず:                                                 │
│ 「もっと詳しく知りたい方は、LINEで担当者に直接相談できます！」     │
├──────────────────────────────────────────────────────────────────┤
│ 【回答例1: 条件検索】                                  ← 固定値 │
│ 【回答例2: 曖昧な質問】                                ← 固定値 │
│ 【間違った回答例】                                     ← 固定値 │
└──────────────────────────────────────────────────────────────────┘
```

**加えて、ツール定義 (`getToolDeclarations`) も同時に送信される:**

```json
// Gemini API payload
{
  "system_instruction": { "parts": [{ "text": "上記プロンプト全文" }] },
  "contents": [ /* 会話履歴 + ユーザーメッセージ */ ],
  "tools": [{
    "functionDeclarations": [
      { "name": "search_stores", "description": "...", "parameters": { /* 11パラメータ */ } },
      { "name": "get_store_detail", "description": "...", "parameters": { "store_id": ... } },
      { "name": "get_areas", "description": "...", "parameters": {} },
      { "name": "get_categories", "description": "...", "parameters": {} }
    ]
  }],
  "generationConfig": { "temperature": 0.4, "maxOutputTokens": 2048 }
}
```

---

### 2. Fine-tuned mode プロンプト (OpenAI) (`buildOpenAiSystemPrompt`)

OpenAI Chat Completions API の `system` メッセージとして送信。
Agent mode より大幅に軽量（ツール定義・検索ルール・回答例なし）。

```
┌──────────────────────────────────────────────────────────────────┐
│ ペルソナ定義 + LINE誘導                                 ← 固定値 │
│ あなたはRecta AIです。ナイトワーク（キャバクラ・ラウンジ・         │
│ ガールズバー・クラブ・コンカフェ）専門のキャリアアドバイザー       │
│ として、求職者の相談に親身に応えてください。丁寧だけど             │
│ フレンドリーな口調で、具体的なお店の情報を交えて回答します。       │
│ ナイトワーク以外の話題にはやんわりお断りしてください。             │
│ 回答の最後には必ず「もっと詳しく知りたい方は、LINEで担当者に      │
│ 直接相談できます！」を付けてください。                             │
├──────────────────────────────────────────────────────────────────┤
│ 運営追加指示: {setting.system_prompt}          ← 管理画面で編集 │
│ ※ 空の場合は省略                                                 │
├──────────────────────────────────────────────────────────────────┤
│ ユーザーは{userArea}付近にいます。             ← ブラウザ位置情報 │
│ エリア指定がない場合は近くのお店を優先してください。               │
│ ※ Geolocation未許可時は省略                                      │
├──────────────────────────────────────────────────────────────────┤
│ 参考店舗データ:                               ← 店舗詳細ページ時 │
│ {storeContext}                                                    │
│ ※ page_type=detail の場合のみ                                    │
└──────────────────────────────────────────────────────────────────┘
```

**OpenAI API payload:**

```json
{
  "model": "ft:gpt-4o-mini-2024-07-18:personal:recta-advisor:XXXXXXXX",
  "messages": [
    { "role": "system", "content": "上記プロンプト全文" },
    { "role": "user", "content": "前の会話1" },
    { "role": "assistant", "content": "前の回答1" },
    { "role": "user", "content": "今回のメッセージ" }
  ],
  "temperature": 0.4,
  "max_tokens": 2048
}
```

**なぜ軽量か:** Fine-tuned モデルは訓練データで店舗情報・回答パターンを学習済みのため、
Agent mode のような検索ルール・フォーマット指示・回答例が不要。

---

### 3. Fine-tuned mode フォールバック (Gemini) (`buildSystemPrompt`)

OpenAI未設定時のフォールバック。Gemini API にツールなしで送信。
**全店舗データをプロンプト内に埋め込む** ためトークン消費が大きい。

```
┌──────────────────────────────────────────────────────────────────┐
│ 【ペルソナ】                                           ← 固定値 │
│ （Agent modeと同一のペルソナ定義）                                │
│ 口調: {toneDesc}                              ← 管理画面で設定 │
├──────────────────────────────────────────────────────────────────┤
│ 【運営からの追加指示】                         ← 管理画面で編集 │
│ {setting.system_prompt}                                          │
├──────────────────────────────────────────────────────────────────┤
│ 【ユーザーの現在地】                      ← ブラウザGeolocation │
│ {userArea}付近にいます。                                          │
├──────────────────────────────────────────────────────────────────┤
│ 【店舗データ】                              ← DBから動的生成 │
│ 【掲載店舗一覧】                                                 │
│ [STORE:1] Club Lumière（六本木/キャバクラ）最寄り:六本木駅        │
│   時給:5000〜10000円 当日体入OK 保証:3ヶ月 特徴:未経験歓迎,...    │
│ [STORE:2] Lounge Étoile（銀座/ラウンジ）最寄り:銀座駅            │
│   時給:4000〜8000円 バック:ドリンク,指名 特徴:ノルマなし,...       │
│ ... (全件展開、Cache 10分)                                        │
├──────────────────────────────────────────────────────────────────┤
│ 【店舗データの参照方法】                               ← 固定値 │
│ - 店舗紹介時に [STORE:ID] マーカーを付ける                        │
│ - マーカーがあるとユーザー画面に店舗カードが自動表示               │
│ - 1回の回答で2〜3店舗（5件以上の羅列はNG）                        │
│ - データに載っていないお店は紹介してはいけない                     │
├──────────────────────────────────────────────────────────────────┤
│ 【絶対ルール】〜【回答例】〜【間違った回答例】         ← 固定値 │
│ （Agent modeと同様だが、ツール関連の記述が店舗データ参照に置換）   │
└──────────────────────────────────────────────────────────────────┘
```

**Gemini API payload（ツールなし）:**

```json
{
  "system_instruction": { "parts": [{ "text": "上記プロンプト全文（店舗データ含む）" }] },
  "contents": [ /* 会話履歴 + ユーザーメッセージ */ ],
  "generationConfig": { "temperature": 0.5, "maxOutputTokens": 2048 }
}
```

---

### 4. Fine-tuning 訓練データのシステムプロンプト

OpenAI にアップロードする JSONL の各行に含まれる `system` メッセージ。

```
┌──────────────────────────────────────────────────────────────────┐
│ あなたは「Recta AI」、ナイトワーク（キャバクラ・ラウンジ・         │
│ ガールズバー・コンカフェ）専門のキャリアアドバイザーです。         │
│ 求職者に寄り添い、親しみやすく丁寧に、お店の情報や                │
│ 働き方のアドバイスを提供してください。                             │
│ 店舗を紹介する際は [STORE:店舗ID] マーカーを必ず含めて            │
│ ください。ナイトワーク以外の質問は丁寧にお断りしてください。      │
│                                                        ← 固定値 │
│ ※ 全訓練ペアで共通                                               │
│ ※ FineTuningController::convertToOpenAiFormat() で設定            │
│ ※ 管理画面「学習」タブから手動追加する場合も同じプロンプトが適用   │
└──────────────────────────────────────────────────────────────────┘
```

---

### 管理画面で編集可能な部分まとめ

| 項目 | 管理画面の場所 | 影響するモード | 影響する箇所 |
|------|---------------|---------------|-------------|
| **システムプロンプト** | AIチャット設定 > プロンプトタブ | Agent / FT(OpenAI) / FT(Gemini) | `setting.system_prompt` → 「運営からの追加指示」セクション |
| **口調 (tone)** | AIチャット設定 > プロンプトタブ | Agent / FT(Gemini) | `toneDesc` → ペルソナの口調指定 |
| **有効/無効** | AIチャット設定 > プロンプトタブ | 全モード | `setting.enabled` → チャット自体のON/OFF |
| **サジェストボタン** | AIチャット設定 > サジェストタブ | 全モード（UI側） | 初期表示のボタンテキスト |
| **利用制限** | AIチャット設定 > 利用制限タブ | 全モード | 日次/月次/IP制限値 |
| **訓練データ** | AIチャット設定 > 学習タブ | FT(OpenAI) のみ | 次回Fine-tuning時に反映。編集/追加/削除可 |

### コード内固定値（変更にはデプロイが必要）

| 項目 | 定義場所 (AiChatController.php) |
|------|-------------------------------|
| ペルソナ定義 | `buildAgentSystemPrompt()` L819-823 / `buildSystemPrompt()` L946-950 / `buildOpenAiSystemPrompt()` L759 |
| 絶対ルール（質問返し禁止等） | `buildAgentSystemPrompt()` L837-842 / `buildSystemPrompt()` L969-973 |
| 検索のコツ（キーワード→パラメータ変換） | `buildAgentSystemPrompt()` L844-854 |
| 給与・待遇ルール | `buildAgentSystemPrompt()` L856-860 / `buildSystemPrompt()` L975-979 |
| 回答フォーマット | `buildAgentSystemPrompt()` L881-884 / `buildSystemPrompt()` L992-995 |
| LINE誘導文 | `buildAgentSystemPrompt()` L886-888 / `buildSystemPrompt()` L997-999 |
| 回答例（2パターン） | `buildAgentSystemPrompt()` L890-911 / `buildSystemPrompt()` L1001-1012 |
| ツール定義（4ツール） | `getToolDeclarations()` L23-112 |
| 訓練データのシステムプロンプト | `FineTuningController::convertToOpenAiFormat()` / `addTrainingPair()` |
| temperature / maxOutputTokens | Agent: 0.4/2048, FT(OpenAI): 0.4/2048, FT(Gemini): 0.5/2048 |

---

### 店舗詳細ページのコンテキスト (`buildStoreContext`)

`page_type=detail` かつ `store_id` 指定時のみ付与される追加情報:

```
【現在閲覧中の店舗】
店名: Club Lumière
エリア: 六本木（六本木駅）
カテゴリ: キャバクラ
時給: 5,000〜10,000円
営業時間: 20:00〜LAST
定休日: 日曜日
日給目安: 30,000〜50,000円         ← あれば
バック: ドリンク:1,000円, 指名:2,000円  ← あれば
ノルマ: なし                        ← あれば
保証: 3ヶ月 時給保証               ← あれば
当日体入: OK（体入時給: 5,000円）   ← あれば
特徴: 未経験歓迎, ノルマなし, 送りあり  ← あれば
説明: 六本木の老舗キャバクラ...
詳細特徴: ...                       ← あれば
```

---

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `frontend/app/components/user/AiChatPanel.tsx` | チャットUI全体 |
| `frontend/app/lib/api.ts` | API通信クライアント |
| `frontend/app/lib/line.ts` | LINE友だち追加URL管理 |
| `backend/app/Http/Controllers/AiChatController.php` | チャットAPI (全ロジック) |
| `backend/app/Models/AiChatLog.php` | チャットログ |
| `backend/app/Models/AiChatSetting.php` | ページ別設定 |
| `backend/app/Models/AiChatLimit.php` | 利用制限 |
| `backend/app/Console/Commands/GenerateFineTuningData.php` | 訓練データ生成 (10パターン) |
| `backend/app/Http/Controllers/Admin/FineTuningController.php` | Fine-tuning管理API |
| `backend/config/services.php` | API設定 (gemini, openai) |

---

## モード比較

| | Agent mode | Finetuned mode (OpenAI) | Finetuned mode (Gemini fallback) |
|---|---|---|---|
| **API** | Gemini 3.1 Flash-Lite | OpenAI gpt-4o-mini (ft) | Gemini 3.1 Flash-Lite |
| **ツール** | Function Calling (4ツール) | なし | なし |
| **店舗データ** | ツール経由でDB検索 | モデルが学習済み | システムプロンプトに全件埋め込み |
| **店舗抽出** | ツール結果から直接 | [STORE:ID]マーカーで抽出 | [STORE:ID]マーカーで抽出 |
| **Temperature** | 0.4 | 0.4 | 0.5 |
| **トークン消費** | 中 (ツール結果分) | 小 (プロンプト軽量) | 大 (全店舗埋め込み) |
| **レイテンシ** | 中〜高 (ツールループ) | 低 | 中 |
| **精度** | 高 (リアルタイムDB検索) | 中 (学習時のデータ) | 中 (プロンプト内データ) |
