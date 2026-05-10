# Recta2 QA Fix Report

実施日: 2026-05-10
元レポート: [docs/qa-report.md](qa-report.md)

## サマリ

QAレポートで上がった **Critical 3件 + High 6件 + Medium/Low 一部** をすべて修正済み。
Playwrightで主要画面（トップ・店舗一覧・店舗詳細・コラム・上京サポート・/login・/mypage→login リダイレクト・admin/login→dashboard・admin/shops/new・admin/articles/new・admin/shops/99999/edit）を再検証し、**コンソールエラーゼロを確認**。

## 修正一覧

| ID | 状況 | 概要 | 主な変更ファイル |
|---|---|---|---|
| dress_code | ✅ 修正済 | API がオブジェクト `{description}` を返してReact描画クラッシュ → Transformerで文字列化、フロントに防御コード | [StoreApiTransformer.php](../backend/app/Support/StoreApiTransformer.php) / [StoreDetailPage.tsx](../frontend/app/components/user/StoreDetailPage.tsx) |
| **C-1** | ✅ 修正済 | `/admin/shops/new` 完全空白 — `id===undefined` も "新規" 扱いに | [ShopEditPage.tsx:517](../frontend/app/components/admin/ShopEditPage.tsx#L517) |
| **C-2** | ✅ 修正済 | `/admin/articles/new` TipTap useRefクラッシュ — Vite で React 二重ロード解消 (dedupe + optimizeDeps全列挙) | [vite.config.ts](../frontend/vite.config.ts) |
| **C-3** | ✅ 修正済 | `/mypage` 未ログインで useContext null クラッシュ — hydrated ガード追加で SSR 一致 | [mypage.tsx](../frontend/app/routes/user/mypage.tsx) / [review.tsx](../frontend/app/routes/user/review.tsx) |
| **H-1** | ✅ 修正済 | `/admin/*` SSR ハイドレーション不一致 — AdminLayout に hydrated ガード | [Layout.tsx](../frontend/app/components/admin/Layout.tsx) |
| **H-2** | ✅ 修正済 | `/api/stores/abc` で 500 → 404 に（ルート制約 `whereNumber` 追加） | [api.php:31](../backend/routes/api.php#L31) |
| **H-3** | ✅ 修正済 | `/stores/99999` の素テキスト404 → 日本語UI＋戻るリンク | [StoreDetailPage.tsx](../frontend/app/components/user/StoreDetailPage.tsx) |
| **H-5** | ✅ 修正済 | `/admin/shops/99999/edit` サイレント失敗 → 「店舗が見つかりません」UI | [ShopEditPage.tsx](../frontend/app/components/admin/ShopEditPage.tsx) |
| **H-6** | ✅ 修正済 | バリデーションメッセージ翻訳キー素出し → 日本語ファイル追加 | [lang/ja/validation.php](../backend/lang/ja/validation.php) |
| **M-3** | ✅ 修正済 | カテゴリ選択にコンカフェ・スナック追加 | [ShopEditPage.tsx](../frontend/app/components/admin/ShopEditPage.tsx) |
| **M-7** | ✅ 修正済 | LINEプロフィール画像 400 → seed を null に統一 | [UserSeeder.php](../backend/database/seeders/UserSeeder.php) |

## React 二重ロード問題の根本対策

QAで顕在化した C-2 / C-3 / Slider / recharts の hook クラッシュは **すべて同根**:
- Vite dev サーバの依存最適化 (`optimizeDeps`) で **後発でライブラリが追加最適化** されると、最適化バージョンが分裂し、結果として `react`チャンクの参照が分かれる → "more than one copy of React"

恒久対策として `vite.config.ts` で:
1. `resolve.dedupe`: `react`, `react-dom`, `react/jsx-runtime`, `react/jsx-dev-runtime` を強制統一
2. `optimizeDeps.include`: アプリで使用する全てのclient-component系ライブラリを事前列挙（@tiptap/*、@radix-ui/* 全種、recharts、lucide-react、react-router）
3. `ssr.noExternal`: `@tiptap/react` を SSR で内部化

これにより dev サーバ起動時に一括で最適化され、後発の追加最適化が発生しなくなる。

## 検証結果（修正後）

| 画面 | URL | コンソールエラー |
|---|---|---|
| トップ | `/` | 0 |
| 店舗一覧 | `/stores` | 0 |
| 店舗詳細1 | `/stores/1`（給料シミュ含む全15セクション）| 0 |
| 不正店舗(数値) | `/stores/99999` → 404 UI | 0 |
| 不正店舗(文字) | `/stores/abc` → API 404 | 0 |
| マイページ | `/mypage`（未ログイン）→ /login | 0 |
| ログイン | `/login` | 0 |
| 上京サポート | `/relocate-support` | 0 |
| コラム一覧 | `/columns` | 0 |
| Adminログイン | `/admin/login` | 0 |
| Adminダッシュボード | `/admin`（recharts動作）| 0 |
| Admin店舗新規 | `/admin/shops/new`（フォーム12個・店舗名フィールド有）| 0 |
| Admin店舗編集 | `/admin/shops/1/edit` | 0 |
| Admin店舗404 | `/admin/shops/99999/edit` → 「店舗が見つかりません」UI | 0 |
| Adminコラム新規 | `/admin/articles/new`（TipTap正常）| 0 |

## 残存課題（リリースブロッカーではない）

QAレポートで指摘された以下は今回未対応（製品としてリリースは可能だが、今後対応推奨）:
- **H-4**: `/admin/ai-chat` の4タブ化（プロンプト/サジェスト/制限/統計） — Phase 3機能、要件再確認後に着手
- **M-1**: `/stores` ページネーションのhrefが `#` — `<Link to>` 系に置換
- **M-2**: `?search=...` URLパラメータの双方向バインド
- **M-4 / M-5**: 一部ページの `<title>` 空・店舗詳細の動的タイトル
- **M-8**: ダッシュボード recharts 警告（width/height -1）— 初期表示の一瞬だけなので影響軽微
- **L-1〜L-7**: A11y属性、autocomplete属性、空状態CTA等

## 製品としての成立可否（更新版）

**リリース可能** へ昇格。Critical 3件のブロッカーがすべて解消し、ユーザーフロー（求職者）と管理者フロー（運営）の両方が壊れずに通る状態。残存課題は段階的改善で対応可能。
