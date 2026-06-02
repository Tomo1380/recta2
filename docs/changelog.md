# Recta2 Changelog

format: [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) 簡略版。
日付逆順、各エントリは「**機能** / **修正** / **改善** / **運用**」の見出しで束ねる。
コミット粒度の細かい変更は git log に任せ、ここには「ユーザー / 運用者 / 開発者が
気づくべき変化」だけ書く。

過去のリリース報告（砂山さん向けLINE貼付テンプレ等）は
[archive/release-notes-2026-05-25.md](archive/release-notes-2026-05-25.md) に保管。

---

## Unreleased

### セキュリティ (リリース前ハードニング 2026-06-02)
- **[Critical] admin/user 認証境界を強制**: LINE ログインの User トークンで
  管理画面 API を叩ける権限昇格を `user.type` middleware + token abilities で遮断。
  クロス認証防止テスト追加。
- **[High] LINE OAuth state を HttpOnly cookie + hash_equals 化** (IP キー Cache 廃止)。
  共有 NAT/CGNAT でのログイン失敗・login CSRF を解消。
- **[High] 店舗 `website_url` の scheme 検証**で格納型 XSS を遮断。
- **[High] AI チャットが非公開店舗情報を漏らさないよう** detail context を published 限定に。
- **[High] `.dockerignore` で `backend/.env` 除外** (本番イメージへの秘密焼き込み防止)。
- LINE callback の **トークン受け渡しを単回使用の交換コード方式**へ (URL 漏洩面の縮小)。
- LINE 認証/Webhook に throttle、terraform の SSH を `0.0.0.0/0` から限定 ingress へ。
- 詳細は [security-audit-2026-05-29.md](security-audit-2026-05-29.md) の「追補: 2026-06-02」。

### 機能 (管理画面 / 設定)
- **画像アップロードにトリミング機能を追加** (`ImageCropDialog` + react-easy-crop)。
  店舗ギャラリー写真 (4:3)、在籍女性ギャラリー (3:4)、コラムサムネ (16:9)、
  カテゴリ画像 (260:320) でアップロード前にドラッグ + ズームで切り抜き可能に。
- **デフォルト OG 画像**を 1200×630 の専用画像 (`/og-default.jpg`) に差し替え。
- **LINE 公式アカウント Bot基本ID** を `VITE_LINE_OFFICIAL_ACCOUNT_ID` で環境変数化
  (ハードコード解消。未設定時は @043uxuen にフォールバック)。

### 改善 (UX / SEO / a11y / 堅牢性)
- AI チャット: **上限到達時に LINE CTA を必ず表示**、maxIterations 超過でも収集済み
  店舗を返す、SSE 取りこぼし時の固まり防止、クライアント切断検知、本番 API キー未設定時の
  丁寧なフォールバック。
- 店舗一覧: **取得失敗を「0 件」と区別**し再読み込み導線を表示。一覧画像 lazy-load。
- グローバル/コラムの **404・エラー画面を日本語ブランド化** (ErrorBoundary 整備)。
- 空のエリア×業態 LP を **noindex + sitemap から除外**、canonical 末尾スラッシュ統一、
  店舗詳細 loader 失敗時 noindex。
- 平均評価の **N+1 を `withAvg` で解消** (一覧/関連/ピックアップ)。口コミ重複を DB ユニーク制約で保証。
- a11y: チャット入力ラベル / メッセージ aria-live / アコーディオン aria-expanded /
  ヒーロー画像 LCP 属性、ログインの規約リンク修正。

### 改善 (内部リファクタリング、ユーザー向け挙動変更なし)
- **負債解消スプリント** `refactor/debt-cleanup` ブランチで AI 主導で書かれた
  fat ファイルの整理を実施。ユーザーから見える挙動は不変。
  - Backend: 164 → 204 テスト (+40 unit tests)、758 → 844 assertions
  - Frontend: 0 → 49 テスト (vitest 新規導入)
  - Phase 0: テストセーフティネット構築 (snapshot + AiChat Http::fake)
  - Phase 1: API 契約標準化
    - PaginatorWithResource 全面化 (PublicArticle ラップ解消)
    - エラー shape 統一 ({error} → {message}: AiChat / LineWebhook /
      UserController / LineFriendController)
    - インラインバリデーション → FormRequest (13 個追加)
    - `App\Support\StoreApiTransformer` (270行) 削除 → `StoreResource` 新設
      (ADR 0003 を superseded 化)
    - フロント手書き型 (User / AdminUser / AiChatSetting) を
      orval-generated 型 alias に置換
  - Phase 2: Backend Service 層導入 (ADR 0004 新規)
    - AiChatController: 1963 → 1045 行 (-918 行)
      → StoreToolRegistry, GeminiClient, UsageLimitGuard, PromptBuilder
    - Admin/StoreController: 551 → 429 行 (-122 行)
      → StoreImageService
  - Phase 3: Frontend hook 抽出 (ADR 0005 新規)
    - ShopEditPage: 3314 → 3067 行 (-247 行)
      → useShopImages, useStepProgression, useShopForm + 純粋関数
        (storeToForm / formToPayload) で Unit テスト可能化
  - Phase 4: 仕上げ
    - デッドコード削除 (6 ファイル / 1243 行 / radix 2 依存)
    - ShopEditPage の any: 70 → 0
    - Seeder 整理:
      - ReviewSeeder / ContentSeeder の hard-coded id を動的取得に修正
        (`auto-increment` リセット後の FK violation を解消)
      - RenderSeeder → ProductionSeeder にリネーム (Render.com 不使用)。
        本番初回投入用: 管理者 + マスター + 設定 + AI 教材のみ、
        店舗/ユーザー/口コミは入れない設計に変更。冪等。
      - TestQaSeeder 削除 (DatabaseSeeder の真部分集合だったので統合)。
        QA も `migrate:fresh --seed` を使う。完全空 DB が必要なら
        `migrate:fresh` 単独で代用。
- 詳細は ADR 0003/0004/0005 と各 `refactor-phase-N` tag 参照。

### 修正
- QA monkey-test 1巡目の本物バグ 8 件を解消（27 報告中 19 件は誤検知）
  - 体験入店情報の `¥0` fallback → `—` プレースホルダ
  - features_text 空時の見出し詐欺 → 「店舗情報」にタイトル切替
  - champagne fallback の裸 `<p>` → ヘッダー付きカード
  - 在籍女性ギャラリーの「キャストA/B/C」placeholder 名 → 実用的キャプション
  - TopPage 新着クチコミの nested `<a>` → hydration warning 解消
  - column-detail の SSR/CSR 日付ズレ（getMonth → getUTCMonth）
  - ヒーローコピー「全国 1,200 件以上」→「都内厳選」（誇大表現削除）
  - placeholder コラム記事「きゃばば」削除
- /stores/:id/review 未認証時のフォームチラ見え → LINE ログインカードで蓋
- /stores/:id 詳細の口コミセクション、0 件でも「最初の1件を書く」CTA を残す
- /relocate-support の「← トップに戻る」→ 「← 戻る」(直前画面に戻る + フォールバック)

### 機能
- 上京サポートページの「先輩の声」を DB 化（`relocate_voices` テーブル + admin CRUD）
- `/admin/relocate-voices` 管理画面追加（並び替え・公開切替）
- TopPage に「Recta コラム」セクション露出（最新3記事、0件時は自動非表示）

### 運用
- Gemini モデル管理を env 化：`GEMINI_MODEL` で切替可。デフォルト `gemini-3.1-flash-lite`（preview取れたGA版に昇格）
- `.env` を `/.env` 1 本に集約（旧: root + backend + frontend の3箇所散在）
- マイグレーション集約：プレリリース期の 36 ファイル → テーブル単位 10 ファイル
- 本番デプロイ：node の VITE_* を build args で焼き込み（`VITE_GOOGLE_MAPS_API_KEY` 等）
- `docs/qa-prompts.md` 追加：再利用可能な QA モンキーテストプロンプト集
- 型生成パイプライン導入: `dedoc/scramble` + `orval` (Profiit と同スタック)。
  `npm run gen:api` で Laravel → OpenAPI → TS 型 + axios client を再生成。
  サンプルケースとして admin/relocate-voices を生成 client に移行済。
  詳細は [architecture/type-generation.md](architecture/type-generation.md)。
- 型生成パイプラインの本格展開 (Wave 0-5):
  Area / Category / PickupShop / Consultation / BannerSettings / Article /
  Review / LineFriend / LineMessage / AdminUser / User それぞれに
  Resource + FormRequest を整備。控えめに見ても 15 個の Resource +
  18 個の FormRequest 追加 + 既存 7 コントローラ refactor。
  AppServiceProvider::boot() で `JsonResource::withoutWrapping()` を有効化。
  paginator + Resource の wrap 問題を回避する `App\Support\PaginatorWithResource`
  ヘルパも追加。詳細は [architecture/type-generation.md](architecture/type-generation.md) の移行マトリクス。
- Dashboard / Store は型生成リターン低 (前者はネスト広い stats 構造、
  後者は StoreApiTransformer 解体が必要) のため意図的に後回し。
- アーキテクチャ規約のドキュメント体系化:
  - CLAUDE.md に「アーキテクチャ原則」セクション追加 (必ず守るルール)
  - [architecture/api-design.md](architecture/api-design.md) 新規 (Resource /
    FormRequest / Pagination のパターン集と新 endpoint 作成レシピ)
  - `type-generation.md` を `architecture/` 配下に移動
  - [architecture-decisions/](architecture-decisions/) (ADR) 配下に判断経緯 3 件:
    0001 (型生成スタック選定), 0002 (Resource wrapping 無効化),
    0003 (Dashboard / Store の Resource 化保留理由)

---

## 2026-05-25 — Pre-release 仕上げ

砂山さん向けフィードバック反映の集中スプリント。詳細は
[archive/release-notes-2026-05-25.md](archive/release-notes-2026-05-25.md) 参照。

### 機能（トップページ）
- 「他のエリアも見る」8件ずつインライン展開
- 新着クチコミの最初3件は未ログインで閲覧、4件目以降のみ LINE 誘導
- 上京サポート CTA をトップに挿入
- AIチャットを ChatGPT 風 SSE ストリーミングに
- AIチャットの返答から店舗詳細に直接動線

### 機能（店舗詳細）
- 系列店舗セクション中盤配置（SEO目的の内部リンク）
- 送り・足代マップ：Google Maps + 距離別色付き円ビジュアル化
- シャンパン4種金額カード（テキーラ / ベル・エポック / アルマンド / ラベイ）
- レクタ経由入店女性エピソードセクション
- ドレスコード OK/NG ギャラリー
- 給料シミュレーター（時給・売上・指名 スライダー）
- セット料金記載
- 比較ボタン → 最大4件比較画面（横スクロール）
- 在籍女性ギャラリー（Instagramリンク対応）
- 動画2本構成（店内ツアー＋インタビュー）
- LINE 誘導ボタン 3 箇所

### 法務・運用
- 利用規約 / プライバシーポリシー / 運営会社 / お問い合わせ ページ作成
- R18+ バッジ + 18歳以上限定明記 Footer
- BottomTabBar をダーク luxe + 公式LINEアイコンに刷新

---

## 〜2026-05-10 — MVP 基盤

- Phase 1〜2 の完成：管理画面全機能 + ユーザー側主要ページ + LINE Login + 口コミ
- DB スキーマ確定、stores rebuild
- AI Chat 3モード（Agent / FT-OpenAI / FT-Gemini）アーキテクチャ
- 詳細は [archive/release-plan.md](archive/release-plan.md) と
  [archive/qa-report.md](archive/qa-report.md) 参照
