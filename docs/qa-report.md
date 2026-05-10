# Recta2 QA Report

- 実施日: 2026-05-10
- 対象ビルド: ローカル Docker Compose（http://localhost:3333/）
- DBシード状態: stores=80(published 75) / users=11 / reviews=121 / areas=10 / categories=6 / articles=0
- 管理者: `admin@recta2.jp` / `password`（AdminUserSeeder）
- ツール: Playwright MCP（Chromium / 1440x900・375x812）
- スクリーンショット: `/home/isayama/recta2/.claude/test-screenshots/`

## 注記（テスト環境の制約）

以下のMCPツールが本セッションでは権限拒否されたため、ハッキー回避策で代替した:

- `mcp__playwright__browser_console_messages` → ページ毎に出る `console-*.log` ファイルを `Read` で参照
- `mcp__playwright__browser_network_requests` → `Bash` 経由で API を直接叩いて補完
- `mcp__playwright__browser_click` / `browser_press_key` → `browser_evaluate` で `el.click()` / native input setter で代替
（Radix UI のスライダーなど一部はキーボード送信ができず、ドラッグ系インタラクションは未確認）

---

## 総合評価: **リリース不可（ブロッカーあり）**

エンドユーザー側のメインフロー（トップ・店舗一覧・店舗詳細・AIチャット・LINEログイン誘導）は概ね動作するが、以下を含む複数の「壊れた画面」がある:

- 管理画面: **店舗新規作成 / コラム新規作成 が完全に動作不能**（Critical 2件）
- ユーザー画面: **/mypage 遷移時に React フックエラーで真っ白**（Critical 1件）
- 管理画面ほぼ全ページで **SSR ハイドレーション不一致**（High）
- 不正な store ID で **HTTP 500**（API のバリデーション欠如）

これらは全て「製品としてユーザーに見せる前に直すべき」レベル。Critical 2件はリリースをブロックする。

### ブロッカーリスト（リリース前必須修正）

1. **C-1**: `/admin/shops/new` 完全空白（ShopEditPage の id 判定不具合）
2. **C-2**: `/admin/articles/new` クラッシュ（TipTap の useEditor → useRef on null React）
3. **C-3**: `/mypage`（未ログイン）→ `/login` リダイレクトで Invalid Hook Call クラッシュ
4. **H-1**: 管理画面全ページで SSR ハイドレーション不一致（`<div>` vs `<script>`）
5. **H-2**: 不正な store ID（非数値 / SQL injection 風）で API が 500 を返す

---

## バグ一覧

### Critical（リリースブロッカー）

#### C-1. `/admin/shops/new` が完全に空白で操作不能

- 該当URL: `http://localhost:3333/admin/shops/new`
- 該当要素: `frontend/app/components/admin/ShopEditPage.tsx` (516–624行)
- 再現手順:
  1. `admin@recta2.jp / password` で `/admin/login` ログイン
  2. サイドバー「店舗管理」 →「新規作成」ボタンをクリック（または直接URL遷移）
- 期待動作: 多段ステップフォームが表示され、店舗名等を入力できる
- 実際の動作:
  - パンくず（"ダッシュボード / 店舗管理 / 店舗作成"）と謎のアイコンボタン2つ以外、本文がレンダリングされない（`document.body.innerText` 長さ 129）
  - フォーム要素は0個（`document.querySelectorAll('input, textarea, select').length === 0`）
  - DOM構造は infinite loading spinner 状態
  - コンソールに SSR hydration mismatch エラー
- 原因（疑い）:
  - ルート `/admin/shops/new` は `routes.ts` で `routes/admin/shop-new.tsx` → `<ShopEditPage />` をレンダー
  - `ShopEditPage` 内 `const { id } = useParams()` は `undefined`（動的セグメントなしのため）
  - `const isNew = id === "new"` → `false`（"new" 文字列は params 経由で来ない）
  - `useState(!isNew)` → `loading = true` で初期化
  - `useEffect(() => { if (isNew || !id) return; ... })` で `!id` のため即 return → `setLoading(false)` が呼ばれず無限ローディング
- スクショ: `09-admin-shops-new-blank.png`
- 影響: **管理者が新規店舗を登録できない**

#### C-2. `/admin/articles/new` で TipTap が React フックエラーでクラッシュ

- 該当URL: `http://localhost:3333/admin/articles/new`
- 該当要素: `frontend/app/components/admin/ArticleEditor.tsx:392`（`useEditor` 呼び出し）
- 再現手順:
  1. 管理者ログイン後 `/admin/articles/new` に直接遷移、または `/admin/articles` から「新規」を押す
- 期待動作: TipTap エディタを含むコラム作成フォームが表示
- 実際の動作: ページ全体が React Router の error boundary に置き換わり、本文に以下が表示:
  ```
  TypeError: Cannot read properties of null (reading 'useRef')
      at exports.useRef (chunk-RY7GF66K.js:956:35)
      at useEditor (@tiptap_react.js:1052:54)
      at ArticleEditor (ArticleEditor.tsx:392:18)
  ```
  直前に "Invalid hook call. ... You might have more than one copy of React in the same app" の console.error
- 原因（疑い）: Vite プリバンドルの最適化で `react` が二重に解決されている（`@tiptap/react` 側と app 側で別インスタンス）。`vite.config.ts` の dedupe / optimizeDeps の見直しが必要
- スクショ: `11-admin-articles-new-crash.png`
- 影響: **コラム機能の作成側が完全に動作しない**

#### C-3. `/mypage` 未ログイン遷移で Invalid Hook Call → 真っ白画面

- 該当URL: 直接 `http://localhost:3333/mypage` へアクセス（未ログイン）
- 再現手順:
  1. 一切のクッキーがない状態で `/mypage` を開く
- 期待動作: `/login` にリダイレクトされログイン誘導が見える
- 実際の動作:
  - URL は `/login` に変わるが、本文は以下:
    ```
    Oops!
    Cannot read properties of null (reading 'useContext')
    TypeError: ... at useParams ... at WithComponentProps2
    ```
  - 直前 console.error:  "Invalid hook call. Hooks can only be called inside of the body of a function component. ... You might have more than one copy of React in the same app"
- 原因（疑い）: C-2 と同じく React 二重ロード。リダイレクト時の React Router 内部 hook で起爆
- スクショ: `06-mypage-redirect-crash.png`
- 影響: **未ログインで /mypage を踏むと「壊れた」画面でユーザーが離脱する**。/login だけ直接踏めば正常表示なので、ナビゲート経路依存。

---

### High（リリース前に直したい）

#### H-1. 管理画面ほぼ全ページで SSR ハイドレーション不一致

- 該当URL: `/admin`, `/admin/shops`, `/admin/shops/new`, `/admin/shops/:id/edit`, `/admin/users`, `/admin/reviews`, `/admin/ai-chat`, `/admin/articles`, `/admin/articles/new`, `/admin/admin-users`, `/admin/area-category` 全て
- 該当要素: `AdminLayout`（フレームコンポーネント）
- 再現手順: 任意の `/admin/*` URL に直接遷移
- 期待動作: ハイドレーション一致、警告なし
- 実際の動作: 毎回 console.error:
  ```
  Hydration failed because the server rendered HTML didn't match the client.
  ...
    <AdminLayout>
  +   <div className="flex h-screen bg-background">
  -   <script>
  ```
  サーバ側は `<script>`（loader 結果なし）、クライアント側は `<div>`（実体）が来ている。
- 原因（疑い）: Admin Layout がクライアント専用ガード（`typeof window !== 'undefined'`）で分岐しているか、または認証チェックの結果でツリーが変わっている
- 影響: ユーザーには見えないが、初回ロードがチラつき・パフォーマンス劣化、SEO 不要なのでビジネス影響は小だが**コンソールが常時エラー**で本番監視に悪影響

#### H-2. 不正な store ID で API が HTTP 500

- 該当URL/エンドポイント:
  - `GET /api/stores/abc` → 500
  - `GET /api/stores/'1';DROP--` → 500
  - `GET /api/stores/9999` → 404 ✅
  - `GET /api/stores/-1` → 404 ✅
  - フロント側 `/stores/abc` も 500 ページに到達（"HTTP 500\n再読み込み"）
- 再現手順: `curl -H 'Accept: application/json' http://localhost:3333/api/stores/abc`
- 期待動作: 400 Bad Request（バリデーションエラー）または 404（型不一致）
- 実際の動作: 500 Internal Server Error（おそらく Eloquent の cast エラーが未ハンドル）
- 影響: 監視アラート暴発、攻撃面の情報漏洩リスク

#### H-3. `/stores/99999`（存在しない店舗）が「HTTP 404」と素のテキスト表示

- 該当URL: `/stores/99999`
- 期待動作: 日本語の「店舗が見つかりません」UI＋戻るリンク
- 実際の動作: 真っ白い画面に "ログイン" / "HTTP 404" / "再読み込み" のみ。Page title も "店舗詳細 - Recta" のまま
- 影響: ユーザー体験低下、SEO的にも 404 ページの定型UIがない

#### H-4. AIチャット設定 `/admin/ai-chat` が要件の4タブ構成になっていない

- 該当URL: `/admin/ai-chat`
- 期待動作: タブ「プロンプト/サジェスト/制限/統計」（CLAUDE.md・要件記載）
- 実際の動作: 単一画面に「チャット有効/無効・システムプロンプト・トーン・保存」とプレビューだけ。tabs 役割の要素 0 個
- 影響: 利用制限・統計画面が完全に欠落（Phase 3 機能未実装）
- スクショ: `10-admin-ai-chat.png`

#### H-5. `/admin/shops/99999/edit`（存在しないID）が空フォームでサイレント失敗

- 該当URL: `/admin/shops/99999/edit`
- 期待動作: 「店舗が見つかりません」のメッセージ表示
- 実際の動作:
  - API `/api/admin/stores/99999` が 4回連続で 404 を返している（コンソール）
  - UI は普通の編集フォームの「最初のステップ」が表示され、ユーザーは何が起きたか分からない
  - 何か入力して保存しようとした場合の挙動は未確認だが、新規 POST になる可能性あり
- 影響: 管理者が誤って phantom データを作る恐れ

#### H-6. ShopEdit 422 バリデーションメッセージが Laravel の翻訳キー素出し

- 該当URL: `/admin/shops/1/edit` で店舗名に5000文字入力 → 保存
- 実際のメッセージ: `validation.max.string (and 1 more error)`（赤バナー）
- 期待動作: 日本語の「店舗名は255文字以内で入力してください」等
- 影響: 管理者UX劣化。`lang/ja/validation.php` 不整備の可能性大

---

### Medium

#### M-1. /stores ページネーションリンクの href が全て `#`

- 該当URL: `/stores`
- 該当要素: `<nav aria-label="pagination">` 内の全 `<a>` タグ
- 再現手順: /stores を開いて DOM 検査
- 実際の動作: 各 page link の href は `"#"`、JavaScript click で `?page=2` が URL に書き込まれる動作はする
- 影響:
  - 中クリック・新規タブで開けない
  - SEO の crawl ができない
  - クリックでアンカーが飛ぶ副作用（スクロールが上に戻る等）
- 期待動作: `href="?page=2"` で URL を直接持たせる（`<Link to>` 系）

#### M-2. `?search=...` URL パラメータが検索ボックスにバインドされない

- 再現手順: `/stores?search=ABC` で開く
- 期待動作: 検索ボックスに "ABC" がプレフィル、検索結果がフィルタされている
- 実際の動作: 検索ボックスは空。XSS テスト `?search=<script>alert(1)</script>` も入力欄に入らないが裏で処理されたのか不明
- 影響: 共有URL・お気に入りからの直アクセスが失敗

#### M-3. /admin/shops/new のカテゴリ選択肢に「コンカフェ」がない

- 該当URL: `/admin/shops/1/edit` の業種カテゴリ select
- 表示中の選択肢: キャバクラ / ラウンジ / クラブ / ガールズバー
- DBの categories: ラウンジ・キャバクラ・クラブ・ガールズバー・コンカフェ・スナック（6件）
- 実際の動作: コンカフェやスナックが選べない
- 影響: コンカフェ店舗を新規作成できない（既存80店舗のうちコンカフェも複数あるため整合性も崩れる）

#### M-4. /admin/login と /relocate-support 等の `<title>` が空

- 該当URL: `/admin/login`, `/relocate-support`, `/columns/{nonexistent}`
- 期待動作: 各ページ固有のタイトル
- 実際の動作: `document.title === ""`（タブが空タイトル）
- 影響: SEO・タブ管理性

#### M-5. /stores/{id} のページタイトルが常に「店舗詳細 - Recta」

- 期待動作: 「Club Lumière | 六本木のキャバクラ - Recta」のような店舗名入りタイトル
- 影響: SEO

#### M-6. CLAUDE.md の dress_code バグ — 既に部分修正済みだが API レスポンスにキー重複

- API レスポンスに以下が同居:
  - `dress_code: "ドレス貸出あり..."` (string)
  - `dress_code_description: "ドレス貸出あり..."` (string、上と同内容)
  - `dress_code_detail: { description: "..." }` (object)
- DB 上は `dress_code` カラムが JSONB で `{description: "..."}` を保持
- フロント `StoreDetailPage` には `typeof store.dress_code === "object"` の防御コードあり、`/stores/1〜5` では現在 React エラーは発生しない（Resource serializer が文字列に均してくれているため）
- 既知エラーの再現は不可だが、`StoreEditPage.tsx:732` `setDressCodeField((store as any).dress_code || "")` は **API レスポンスが（過去のように）object を返した場合に input value が `[object Object]` になる**地雷あり
- 影響: 現状は表示OK・編集側に潜在地雷。データ整合性のため API・DBで統一推奨

#### M-7. /admin/users で全 LINE プロファイル画像が 400（profile.line-scdn.net）

- 該当URL: `/admin/users`
- 実際の動作: シードされた `line_profile_image_url`（`https://profile.line-scdn.net/sample1.jpg` 等）が全て 400
- 影響: 画像が壊れアイコン表示。LINE は実プロファイルURL以外を返さないので、シードを `null` または placeholder にすべき

#### M-8. ダッシュボードの recharts 警告

- 該当URL: `/admin`
- 実際の動作: `[WARNING] The width(-1) and height(-1) of chart should be greater than 0 ...` が4回
- 影響: 初回チャートサイズが0で計算される瞬間がある（アニメーション初期）。実害は少ないがコンソールが汚い

---

### Low

#### L-1. 管理ログイン: input に autocomplete 属性なし

- 該当URL: `/admin/login`
- console: `[VERBOSE] [DOM] Input elements should have autocomplete attributes (suggested: "current-password")`
- 影響: パスワードマネージャ補完不全

#### L-2. ShopEdit のラベルに `htmlFor` がない

- 該当: `/admin/shops/{id}/edit`
- 実際: `<label>` 12個全て `htmlFor=""`
- 影響: スクリーンリーダーで input とラベルが結びつかない（A11y）

#### L-3. ダッシュボードの口コミ件数が 119 / spec 121 と微差

- 期待: spec 通り 121
- 実際: 119（数件が `pending` ステータスで集計外の可能性あり）
- 影響: 軽微、要確認

#### L-4. AIチャット設定: 「保存」ボタンが何を保存するか不明（プレビュー以外影響先なし）

- 該当: `/admin/ai-chat`
- 影響: H-4 と関連、UI 不完全

#### L-5. 上京サポートバナーのアイコンが H-3 で見るような fallback 表示時の代替なし

#### L-6. /columns 空状態の見た目が貧弱（"まだ記事がありません" のみで誘導CTA無し）

#### L-7. 管理画面サイドバーに「コンテンツ管理」リンクあるが本テストでは未深掘り

---

## 機能別 動作サマリ

### A. エンドユーザー画面

| # | ページ | 動作 | 備考 |
|---|---|---|---|
| 1 | トップ `/` | ◯ | エリア・ピックアップ・新着クチコミ・上京バナー・トレンド相談すべて表示。新着クチコミは3件開放→4件目以降「LINEでログイン」ロック動作も確認 |
| 2 | 店舗一覧 `/stores` | ◯ (一部△) | 全75件・エリアフィルタ◯（銀座=9件）・ページネーション動作 (M-1)・サーチ URL バインド△ (M-2) |
| 3 | 店舗詳細 `/stores/1〜5` | ◯ | 店舗1: 全15セクション表示。store2-5 はデータ欠落のため一部セクション非表示（条件付きレンダーで正常）。`Objects are not valid` の React エラーは現状再現せず（M-6 参照） |
| 4 | 給料シミュレーター | △ | 想定月収 ¥500,000 表示・スライダー存在するが、Radix Slider の操作はキーボードイベント送信不可で未検証 |
| 5 | 口コミ投稿 `/stores/1/review` | ◯ | 未ログインで `/login` リダイレクト動作OK |
| 6 | LINEログイン `/login` | ◯ | LINE OAuth に正しく遷移（client_id=2009379837, scope=profile+openid, state付き） |
| 7 | マイページ `/mypage` | ✗ | C-3 |
| 8 | 上京サポート `/relocate-support` | ◯ | レイアウト・先輩の声まで表示。タイトル空 (M-4) |
| 9 | コラム `/columns` | ◯ | 空ステート表示OK |
| 10 | コラム詳細 `/columns/{nonexistent}` | ◯ | 「記事が見つかりませんでした」表示OK |
| 11 | 不正店舗 `/stores/99999` | △ | 404扱いだが UI が "HTTP 404" 素出し (H-3) |
| 12 | 不正店舗 `/stores/abc` | ✗ | "HTTP 500" 素出し (H-2) |

### B. 管理画面

| # | ページ | 動作 | 備考 |
|---|---|---|---|
| 1 | `/admin/login` | ◯ | seed 認証成功 |
| 2 | `/admin` ダッシュボード | ◯ | 統計（11/75/119/2）表示。recharts 警告 (M-8) |
| 3 | `/admin/shops` | ◯ | 75件一覧・編集リンク有 |
| 4 | `/admin/shops/new` | ✗ | C-1 |
| 5 | `/admin/shops/1/edit` | ◯ | 多段ステップフォーム表示・読み込みOK・保存422表示OK（M-3, M-6, H-6） |
| 6 | `/admin/shops/99999/edit` | △ | サイレント失敗 (H-5) |
| 7 | `/admin/users` | ◯ | 11ユーザ一覧。LINE画像400 (M-7)・hydration mismatch (H-1) |
| 8 | `/admin/reviews` | ◯ | 20行表示（ステータス変更は inline 操作UIなし、表示のみ） |
| 9 | `/admin/ai-chat` | △ | 単一画面のみ、4タブなし (H-4) |
| 10 | `/admin/admin-users` | ◯ | 2件表示 |
| 11 | `/admin/articles` | ◯ | 空ステート表示 |
| 12 | `/admin/articles/new` | ✗ | C-2 |
| 13 | `/admin/area-category` | ◯ | 10エリア＋6カテゴリ表示。並び替え操作は未検証 |

### C. 横断テスト

- **コンソール error が出るページ**:
  - `/admin/*` 全て: hydration mismatch (H-1)
  - `/mypage` (未ログイン): C-3 のフックエラー
  - `/admin/articles/new`: C-2 のフックエラー
  - `/admin/users`: line-scdn 400×8（M-7）
  - `/stores/1`〜: line-scdn 400×3
  - `/stores/abc`: 500→クライアントへ伝播
- **API 4xx/5xx**:
  - `/api/stores/abc`, `/api/stores/'1';DROP--` → 500（H-2）
  - `/api/admin/stores/99999` → 404（4回連続呼び出し / H-5）
  - `/api/columns/{nonexistent}` → 404（コンソールに ApiError）
- **モバイル 375×812**:
  - `/`, `/stores/1`, `/admin/login` で `documentElement.scrollWidth === 375`（横スクロールなし）
  - チップレールは `overflow-x-auto` で意図通り個別スクロール
  - 致命的崩れは未確認。ただし `/admin/*` は元々 PC 想定なのでモバイルで使うべきでないUI
- **AIチャット動作**: 「銀座で時給高い店」送信→ 銀座エリアの3店舗（CLUB Étoile / Club Grâce / CLUB Crystal）を実 DB から拾って提案。LINE誘導CTAも末尾に表示。**動作確認OK**

---

## スクリーンショット一覧

| # | ファイル | 内容 |
|---|---|---|
| 01 | `/home/isayama/recta2/.claude/test-screenshots/01-top.png` | トップ初期表示 |
| 02 | `02-top-after-aichat.png` | チップ「未経験でも大丈夫？」AI回答後 |
| 03 | `03-stores-list.png` | /stores 全表示 |
| 04 | `04-stores-1.png` | /stores/1 全セクション |
| 05 | `05-store-abc-500.png` | /stores/abc が HTTP 500 表示 |
| 06 | `06-mypage-redirect-crash.png` | /mypage 未ログインクラッシュ (C-3) |
| 07 | `07-admin-dashboard.png` | 管理ダッシュボード |
| 08 | `08-admin-shops.png` | 管理店舗一覧 |
| 09 | `09-admin-shops-new-blank.png` | /admin/shops/new 空白 (C-1) |
| 10 | `10-admin-ai-chat.png` | /admin/ai-chat 単一画面 (H-4) |
| 11 | `11-admin-articles-new-crash.png` | /admin/articles/new クラッシュ (C-2) |
| 12 | `12-mobile-top.png` | モバイル トップ |
| 13 | `13-mobile-store-detail.png` | モバイル 店舗詳細 |

---

## 推奨修正優先順位

1. **C-1 / C-2 / C-3** を最優先で修正（リリースブロッカー）
2. C-2 と C-3 は同一の「React 二重ロード」が根本原因の可能性大 → `vite.config.ts` の `resolve.dedupe: ['react', 'react-dom']` ＋ `optimizeDeps.include` で `@tiptap/react` を同梱、を試す
3. C-1 はルート定義の修正（`admin/shops/new` を `/admin/shops/:id` のパラメータ化、または ShopEditPage 側で `id === undefined` も new とみなす）
4. H-1 を直すと Admin 全体の安定性と監視ノイズが激減 → AdminLayout の認証チェックがレンダー時に走っているか確認、loader 化推奨
5. H-2 は `routes/api.php` で `{store}` を `{store:[0-9]+}` 制約 + `Model::findOrFail` の Handler で 404 化
6. H-4 は要件未実装。リリーススコープから外すなら CLAUDE.md/要件側で明示

---

## テスト網羅外（残タスク）

- スライダードラッグでの月収再計算（press_key 不可のため）
- 店舗フィルタの全組み合わせ
- 体験確約ソート → 「体験確約」を最初に表示するロジックの正しさ
- 並び替え D&D（エリアカテゴリ）
- ファイルアップロード（画像）
- ログアウト後の状態
- LINE Login の callback 後フロー（実認証必要）
- 口コミ投稿（要LINEログイン認証）
- AdminUser の権限分離（super_admin と admin の差）
- レート制限・CSRF 検証
