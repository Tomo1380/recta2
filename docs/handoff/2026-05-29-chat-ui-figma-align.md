# Recta AI チャット UI — Figma Make との残差合わせ作業の引継ぎ

作成: 2026-05-29 / 次担当 Claude モデルへの引継ぎメモ

## このドキュメントの目的

トップページの AI チャットを Figma Make のデザインに合わせる作業の途中で、
モデル切替が入った。**直前までに完了している部分 / これからやるべき部分** を
1 ファイルにまとめておくので、次のモデルはこれだけ読めば手を動かせる状態にする。

## 参考リンク (Figma Make)

- ファイル: https://www.figma.com/make/rJX0vWSdtMFnIeNFEFJiHW
- fileKey: `rJX0vWSdtMFnIeNFEFJiHW`
- Make ファイルなので `mcp__figma__get_design_context` 用の nodeId は固定で `0:1`
- ソースは MCP の Resource link で読める (例: `file://figma/make/source/rJX0vWSdtMFnIeNFEFJiHW/src/app/App.tsx`)
- 添付スクリーンショット (会話中に貼ったもの): ヘッダー〜AI 吹き出し〜ピックアップ店舗まで縦長 1 枚

## ここまでに完了済み (2026-05-29 セッション)

### 1. サジェストチップを 2 層化 + DB 化 + chipPop アニメ
- Figma の `CATS` 構造 (L1 タブ [label/sub] → L2 chips) を `ai_chat_settings.suggest_categories` (jsonb) に格納
- `chipPop` keyframe を AiChatPanel に移植 (cubic-bezier(.34,1.56,.64,1) / 0.38s / 各 chip `i*0.05s` stagger)
- L1 切替時に L2 grid を `key={selectedCategory.id}` で再マウントしてアニメ再生
- 該当ファイル:
  - [backend/database/migrations/2026_05_29_000003_replace_suggest_buttons_with_categories.php](../../backend/database/migrations/2026_05_29_000003_replace_suggest_buttons_with_categories.php)
  - [backend/database/seeders/AiChatSettingSeeder.php](../../backend/database/seeders/AiChatSettingSeeder.php)
  - [frontend/app/components/user/AiChatPanel.tsx](../../frontend/app/components/user/AiChatPanel.tsx) (`SuggestActionsCarousel` あたり)

### 2. 表示モード切替 (off / chips_only / categorized)
- 「店舗一覧・詳細ではサジェスト出さない」要件のため、page 単位で表示モードを持たせた
- マイグレーション: [2026_05_29_000004_add_suggest_display_mode_to_ai_chat_settings.php](../../backend/database/migrations/2026_05_29_000004_add_suggest_display_mode_to_ai_chat_settings.php)
- seeder: top=`categorized`, list/detail=`off` (chips_only 用のデータは入れてあるので将来切替可)
- 管理画面: [frontend/app/components/admin/AIChatSettingsPage.tsx](../../frontend/app/components/admin/AIChatSettingsPage.tsx) のサジェストタブに 3 択トグル + Preview 連動
- Laravel テスト 208 件 PASS / TypeScript 0 エラー / `/api/chat/config` 動作確認済み

## これから直すべき残差 (このセッションの未完了タスク)

ユーザーから「チャットのヘッダー / 入力欄 (特に送信ボタン) / AI アバターが Figma と
違うので合わせて」と依頼があった。仕様調査と差分洗い出しは下記の通り済んでいるので、
次のモデルはこの章を見て差分実装に入ればよい。

### 対象ファイル
- 主: [frontend/app/components/user/AiChatPanel.tsx](../../frontend/app/components/user/AiChatPanel.tsx)
- Figma 側ソース: `mcp__figma__get_design_context` で fileKey=`rJX0vWSdtMFnIeNFEFJiHW`, nodeId=`0:1` を読むと
  全 source の resource link が返る。本作業で重要なのは:
  - `src/app/App.tsx` (チャットカード全体)
  - `src/imports/svg-m4am08uz6h.ts` (送信ボタン用 SVG path `p2a5eb480` 等)

### 差分 A — チャットヘッダー

Figma 側のヘッダーは「左に金縦バー＋"AIに相談する" + NEW pill / 右に **Recta AI アバター + "Recta AI" テキスト + パルス点**」という構成。
現状の [AiChatPanel.tsx#L948-L979](../../frontend/app/components/user/AiChatPanel.tsx) は左に小さいアバター + "Recta AI" だけ
で、"AIに相談する" 見出しや NEW pill、右側のアバター/オンラインドットが無い。

**Figma の構造 (App.tsx の `カード内セクションヘダー` ブロック):**
- 左ブロック:
  - 縦 bar: `w-1 h-4 rounded-full / linear-gradient(180deg,#D4AF37,#c8960c)`
  - 見出し: `font: 'Outfit', 700, 16px, letter-spacing -0.02em, color #1b2528` → 内容 "AIに相談する"
  - NEW pill: `linear-gradient(135deg,#1b2528,#2c3e46)` + `border: 1px rgba(212,175,55,.4)` / `font 'Outfit' 600 8.5px tracking .12em` / `color #D4AF37`
- 右ブロック:
  - Recta AI アバター (下記 B 参照、サイズ 22 / hasStreamingMsg のときは外側 box-shadow リングが点灯)
  - テキスト: `font 'Outfit' 700 13px color #1b2528` → "Recta AI"
  - オンラインドット: 6×6 円 + `animate-ping` でゴールド (#D4AF37) パルス

**実装方針:**
- 既存の Header `<div className="flex items-center justify-between px-4 py-3">` を分解して上の構造に書き換え
- Sparkles アイコンによる現アバターを下記 B の `<AiAvatar size={22} />` に置換
- streaming 中だけリングを出すために `messages` の末尾が `streaming: true` かを `hasStreamingMsg` として算出
  (既存の `isLoading` や `streaming` フラグから派生できる)

### 差分 B — AI アバターのアイコン

Figma は「ゴールドのグラデ角丸長方形 + 白いロボットアイコン (SVG path)」。
現状は `<Sparkles className="size-3.5 text-white" />` (lucide のキラキラ ✨)。

**Figma 実装 (App.tsx 抜粋):**
```ts
const AI_AVATAR_BG = "linear-gradient(135deg,#D4AF37,#9a7a20)";
const ROBOT_SVG_PATH = "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1a7 7 0 0 1-7 7H9a7 7 0 0 1-7-7H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 12 2zm-4 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z";

function AiAvatar({ size }: { size: number }) {
  const iconSize = size * 0.625;
  return (
    <div style={{
      width: size, height: size,
      borderRadius: size * 0.44,    // 22 → 9.68px、24 → 10.56px
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
      background: AI_AVATAR_BG,
    }}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <path d={ROBOT_SVG_PATH} fill="white" />
      </svg>
    </div>
  );
}
```

**現状の出現箇所 (全部置換する):**
- ヘッダー左 → 22px
- intro AI 吹き出し用 → 24px
- AI メッセージ吹き出し用 → 24px
- typing dots 用 → 24px

`Sparkles` の import を残すかは要判断 (limitReached 時の AlertTriangle と一緒の `flex` ブロックで使ってる部分は別物なので注意)。

### 差分 C — 入力欄 + 送信ボタン

**Figma 実装 (App.tsx の `Input bar` ブロック L1021-L1044):**
- コンテナ:
  - `padding: 12px 16px` (外側)
  - 内側: `flex items-center gap-2.5 px-4 rounded-2xl`
  - 背景 `#f4f3f1` / 高さ `48px`
  - border: 通常 `1.5px solid rgba(27,37,40,.12)` / demoComplete 時 `1.5px solid rgba(27,37,40,.32)`
  - shadow: demoComplete 時のみ `0 0 0 3px rgba(27,37,40,.06)`
  - 上記 2 つの遷移は `border-color .5s ease .5s, box-shadow .5s ease .5s`
- input:
  - `flex-1 bg-transparent outline-none border-none`
  - `font: 'Noto Sans JP', 400, 13px, color #1b2528`
  - placeholder: demoComplete 時 "あなたも話しかけてみてください…" / そうでなければ "何でも聞いてください…"
  - (Recta では demoComplete 状態は使ってないので、placeholder は単純に「あなたも話しかけてみてください…」固定で OK)
- 送信ボタン:
  - `w-8 h-8 rounded-xl flex items-center justify-center shrink-0 active:scale-90 transition-all`
  - 背景: 入力ありなら `AI_AVATAR_BG` (ゴールドグラデ) / 空なら `rgba(27,37,40,.1)`
  - `transition: all .25s ease`
  - 中身 SVG:
    - `width=14 height=14 viewBox="0 0 18.6667 18.6667" fill=none`
    - `<path d={svgPaths.p2a5eb480} stroke={inputValue ? "white" : "rgba(27,37,40,.35)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />`
    - **path 値** は MCP `file://figma/make/source/rJX0vWSdtMFnIeNFEFJiHW/src/imports/svg-m4am08uz6h.ts` の `p2a5eb480` を参照
      (要旨: 円の中に上向き矢印 = "send")

**現状の問題:**
- 現実装 [AiChatPanel.tsx#L1130-L1180 付近](../../frontend/app/components/user/AiChatPanel.tsx) は `Send` lucide アイコン使用、背景配色も違う、円形 wrapper サイズも違う
- 角丸も `rounded-2xl` ではなく現状もっと丸い

**実装方針:**
- 入力欄コンテナ・input・送信ボタンを Figma 仕様に置換
- `svgPaths.p2a5eb480` は Recta 側に持ってきて (1 path だけなので直接 paste で良い)、定数化:
  ```ts
  const SEND_ARROW_PATH = "...";  // p2a5eb480 の値
  ```
- `Send` の import は不要になったら削除

## 検証手順 (作業完了時に通すべきもの)

```bash
# 型チェック (フロント)
docker compose exec -T node sh -c "cd /app && npx tsc --noEmit"

# Laravel テスト (バックは触らない予定なので 208 件 PASS 維持)
docker compose exec -T laravel php artisan test

# 開発 DB の状態を確認
curl -s 'http://localhost:3333/api/chat/config?page_type=top' | python3 -m json.tool
# → enabled=true, suggest_display_mode=categorized, suggest_categories が 4 件

# ブラウザで http://localhost:3333 を開きトップページの AI チャットを目視
```

## デザイントークン早見表

| token | 値 | 用途 |
|---|---|---|
| GOLD | `#D4AF37` | アバター背景・縦bar・パルスドット |
| GOLD (deep) | `#9a7a20` | アバターグラデ終点 |
| GOLD (deep alt) | `#c8960c` | 縦bar グラデ終点 |
| DARK | `#1b2528` | テキスト主色・NEW pill 背景 |
| AI_AVATAR_BG | `linear-gradient(135deg,#D4AF37,#9a7a20)` | アバター / 送信ボタン (active) |
| 入力欄背景 | `#f4f3f1` | 入力欄コンテナ |
| 入力欄 border (idle) | `1.5px rgba(27,37,40,.12)` | 入力欄 |
| 入力欄 border (focus 風) | `1.5px rgba(27,37,40,.32)` + ring `0 0 0 3px rgba(27,37,40,.06)` | demoComplete 時 |
| 和文 | `'Noto Sans JP', sans-serif` | 本文 |
| 欧文 | `'Outfit', sans-serif` | 見出し・ロゴ・NEW pill |

## 注意点・ハマりどころ

1. **MCP の Figma 認証は session で揮発する可能性あり** — `mcp__figma__whoami` で確認、ダメなら `mcp__figma__authenticate` から OAuth フローを再走させる。フローは localhost:65153 にリダイレクトされる前提で、WSL 環境では URL を手で貼り戻して `mcp__figma__complete_authentication` に投げる。
2. **.env が repo に無い** — Laravel テストは `cp backend/.env.testing backend/.env` で .env を用意してから実行している。CI 側の前段確認も推奨。
3. **orval は node コンテナの中** — ホストには無いので `docker compose exec -T node sh -c "cd /app && npx orval --config ./orval/orval.config.ts"` で叩く。Laravel スキーマ変更したら `php artisan scramble:export` → `cp` → orval の順。今回のヘッダー/入力欄/アバター修正はフロントのみなので orval 再生成は不要。
4. **AiChatPanel の Header はメモ化されてない** — 22px アバターの box-shadow リングを `streaming` のときだけ点けるなら、useMemo は不要だが props 系の再レンダーで `box-shadow` がチラつかないか目視で確認すること。

## 参照: 完了済みコミットになっていない変更ファイル一覧

`git status` で見える状態 (このセッション開始時から):

- 既存ブランチ `feat/qa-2026-05-29` 上で作業
- 新規追加:
  - `backend/database/migrations/2026_05_29_000003_replace_suggest_buttons_with_categories.php`
  - `backend/database/migrations/2026_05_29_000004_add_suggest_display_mode_to_ai_chat_settings.php`
  - `backend/.env` (← `.env.testing` のコピー、テスト用)
- 変更:
  - `backend/app/Http/Controllers/AiChatController.php`
  - `backend/app/Http/Requests/Admin/UpdateAiChatSettingRequest.php`
  - `backend/app/Models/AiChatSetting.php`
  - `backend/database/seeders/AiChatSettingSeeder.php`
  - `backend/tests/Feature/{AdminAiChatSettingTest,AiChatTest,PublicApiTest}.php`
  - `frontend/app/components/admin/AIChatSettingsPage.tsx`
  - `frontend/app/components/user/AiChatPanel.tsx`
  - `frontend/orval/generated/api.schemas.ts` (自動生成)
  - その他 git status 既存の変更ファイル (このセッション以前のもの)

コミット粒度の希望はユーザー確認まだ取ってない。次のモデルがヘッダー修正完了したら、まとめて 1 commit でも分割でも良いか聞くこと。
