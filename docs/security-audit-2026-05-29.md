# Security Audit — 2026-05-29

本番デプロイ前のセキュリティ監査。OWASP Top 10 / Laravel + React Router 観点で
**実害のあるリスク** を洗い出し、High クラスを今回の作業で全部潰した記録。

## 監査対象

- バックエンド: `backend/` (Laravel 12 + Sanctum)
- フロントエンド: `frontend/` (React Router v7 SSR)
- 認証: admin (email+password) + user (LINE Login OAuth)
- インフラ: Docker Compose (本番は AWS EC2 + Nginx + Laravel + Node)

## 実施した監査項目

1. 依存パッケージ脆弱性 (`npm audit`, `composer audit`)
2. 認証 (`AuthController`, `LineAuthController`, `Admin\AuthController`)
3. 認可 (各 admin API のミドルウェア + Policy / Gate)
4. CSRF (Sanctum SPA 構成、`bootstrap/app.php`)
5. XSS (`dangerouslySetInnerHTML`, `innerHTML`)
6. トークン保管 (`localStorage`)
7. Mass assignment / SQL Injection / File upload / OAuth state / Rate limit

## 監査前の脆弱性

### 依存パッケージ

**npm (frontend):**

| Package | Severity | Note |
|---|---|---|
| body-parser, express, qs | high/medium | `npm audit fix` で 1.20.5 / 4.22.2 / 6.15.1 へ |
| path-to-regexp | high | 同上で解消 |
| lodash | high | 同上で解消 |
| picomatch | high | 同上で解消 |
| @vitest/mocker, vite, vite-node, vitest, @vitest/ui, esbuild | moderate | **dev only** (本番バンドルに含まれない) → 受容 |

修正前: 12 件 (high 4, moderate 8) → 修正後: 6 件 (moderate, dev only)

**composer (backend):**

| Package | Severity |
|---|---|
| symfony/http-foundation, http-kernel, mailer, mime, routing | high / medium |
| symfony/polyfill-intl-idn | medium |
| symfony/yaml | low x3 |
| league/commonmark | medium |

修正前: 12 件 → 修正後: **0 件** (`composer update` で symfony 6.4.x → 7.4.x 等)

### High クラス (今回修正)

#### H-1: TipTap 出力の HTML を `dangerouslySetInnerHTML` でサニタイズなく出力

**場所**: `frontend/app/routes/user/column-detail.tsx:286`
**問題**: コラム本文 HTML を `<script>` 除去のみで `dangerouslySetInnerHTML`。
`<img onerror>`, `<svg onload>`, `data:` / `javascript:` URI が通過する。
admin の TipTap 出力 → user 表示の経路で stored XSS のリスク。

**修正**: `isomorphic-dompurify` を導入し `transformBodyHtml()` でサニタイズ。
SSR/CSR 両対応。iframe (YouTube/TikTok 埋め込み) と data-* 属性は明示的に許可。

**実装**: commit に含む。`frontend/package.json` 依存追加。

```ts
import DOMPurify from "isomorphic-dompurify";
const safe = DOMPurify.sanitize(transformed, {
  ADD_TAGS: ["iframe"],
  ADD_ATTR: ["allow","allowfullscreen","frameborder","scrolling","data-video-id","cite","target"],
  ALLOW_DATA_ATTR: true,
});
```

#### H-2: Sanctum トークンが無期限

**場所**: `backend/config/sanctum.php:50`
**問題**: `'expiration' => null` のため Personal Access Token が一度発行されると
永続。XSS/盗難で漏れたトークンが永遠に有効。

**修正**: `'expiration' => env('SANCTUM_EXPIRATION', 43200)` (= 30 日)。
admin/user 共通で 30 日 TTL。次回ログインで自動延長。

**残課題 (今回スコープ外)**:
- 本来は httpOnly + Secure cookie + SameSite=Strict が理想だが、Sanctum SPA
  モードへの移行は影響範囲が広いため次フェーズ。30 日 TTL でリスク窓を制限。
- Refresh token rotation は未実装。

#### H-3: AdminUser CRUD が `auth:sanctum` のみで RBAC なし

**場所**: `backend/routes/api.php:74-195`, `backend/app/Http/Controllers/Admin/AdminUserController.php`
**問題**: AdminUser の create / update / resetPassword / destroy が
`auth:sanctum` のみで保護されており、`admin` ロールの管理者が `super_admin` を
含む他の管理者を削除・パスワード変更・昇格できる。

**修正**: `AdminUserController` に `ensureSuperAdmin()` ガードを追加し、
index 以外の全アクションで `role === 'super_admin'` を確認。さらに destroy で
自分自身を削除できないよう同 id チェックを追加。

```php
private function ensureSuperAdmin(Request $request): void
{
    $actor = $request->user();
    if (!$actor || ($actor->role ?? 'admin') !== 'super_admin') {
        throw new HttpException(403, '管理ユーザーの操作には super_admin 権限が必要です。');
    }
}
```

**残課題**:
- Policy + Gate ベースに将来書き直し検討。
- 他の admin endpoints (StoreController, AiChatSettingController など) は
  `admin` 全員が触れる現状で運用上問題ないと判断 (運営内部のみ)。

### Medium クラス (今回見送り — 次フェーズ)

#### M-1: LINE OAuth state を IP ベースで管理

**場所**: `backend/app/Http/Controllers/LineAuthController.php:36`
**問題**: 同一 IP の別タブで OAuth フローを開始すると state を上書き。
共有 WiFi / プロキシ環境で他者の state とぶつかる可能性。

**判断**: 実害は低い (LINE は OAuth code を一度しか使えない仕様 + state mismatch でリジェクト)。
次フェーズで session ID + random に切替予定。

#### M-2: CSRF middleware 設定が明示されていない

**場所**: `backend/bootstrap/app.php`
**問題**: Laravel 12 のデフォルトで `/api/*` は CSRF 除外されているが、
コードに明示されていない。将来の middleware stack 変更でうっかり付くリスク。

**判断**: 設定漏れではないので緊急性なし。次フェーズでコメント追記予定。

#### M-3: Admin login の throttle が `10,10` (10 分 / 10 回)

**場所**: `backend/routes/api.php:76`
**問題**: 1 分 / 1 回ペースで brute force が継続可能。

**判断**: 実害は低い (password hash + email enumeration なし)。次フェーズで
`5,15` に強化予定。

### Low / Note クラス (確認のみ・修正不要)

- **DB raw SQL** (`PublicStoreController` の `orderByRaw` 等): すべて parameter
  binding (?) 経由。SQL injection なし。
- **Mass assignment**: 全 model で `$fillable` 明示。`$request->all()` 直渡し
  パターンなし。`$request->only(fillableFields())` で whitelist。
- **File upload** (`Admin/StoreImagesController`, `UploadMediaRequest`):
  MIME whitelist (jpeg/jpg/png/webp/gif) + 10MB size limit + S3 UUID
  filename。問題なし。
- **`url` validation での regex 分離**: URL validation を array 形式の
  regex で書いており `|` 分割問題は回避済み (CLAUDE.md にも明記)。

## 監査後の状態

- npm vulnerabilities: 6 件 (moderate, dev only)
- composer vulnerabilities: 0 件
- High クラス: 0 件 (今回 3 件すべて解消)
- Medium クラス: 3 件 (次フェーズで対応予定)

## 次フェーズで対応する項目

1. LINE OAuth state を session + random ベースへ
2. Admin login throttle を `5,15` に強化
3. Sanctum を SPA cookie モードへ (httpOnly + Secure + SameSite)
4. Policy + Gate で AdminUser RBAC をより厳密に
5. Refresh token rotation の検討

---

# 追補: 2026-06-02 リリース前ハードニング (多観点レビュー)

商用リリース直前に、セキュリティ / UX / 不具合 / LINE 導線 / SEO / a11y /
パフォーマンス / データ運用の多観点で全コードを再レビューし、確定した指摘を
敵対的検証のうえ修正した。本セクションは実装に反映済みの内容を記録する。

## Critical

- **admin/user トークン境界の欠如を修正**
  - 事象: AdminUser と User が同一 `personal_access_tokens` を共有し、admin API は
    `auth:sanctum` のみで tokenable 種別を検証していなかった。LINE ログインの
    User トークンで管理画面 API 全権限 (店舗 CRUD / 全 PII / 口コミ改ざん /
    LINE 一斉配信) を実行可能だった。
  - 対策: `EnsureUserType` middleware (`user.type:admin` / `user.type:user`) を
    追加し、admin/user 各ルートグループで tokenable モデル種別を強制。トークンに
    abilities (`admin` / `user`) も付与 (defense-in-depth)。
    `tests/Feature/AuthBoundaryTest.php` でクロス認証 403 を保証。

## High

- **LINE OAuth state を IP キー Cache → HttpOnly+SameSite=Lax cookie + hash_equals** に変更
  (`LineAuthController`)。共有 NAT/CGNAT 配下での state 上書きによるログイン失敗・
  login CSRF を解消。「次フェーズ項目 1」を実装。
- **店舗 `website_url` の scheme 検証**を追加 (`StoreController`、`regex:#^https?://#i`)。
  `javascript:`/`data:` を href に出す格納型 XSS を遮断。
- **AI チャットの非公開店舗漏洩を修正** (`PromptBuilder::buildStoreContext` を
  `publish_status=published` 限定に)。
- **`.dockerignore` で `backend/.env` を除外** (`**/.env`)。本番 PHP イメージへの
  秘密情報焼き込みを防止。
- **空のエリア×業態 LP を noindex + JSON-LD 抑制**、sitemap も公開店舗が存在する
  組み合わせのみ収録 (薄い/虚偽ページの index 回避)。

## Medium (主なもの)

- LINE OAuth callback の **トークン URL 受け渡しを単回使用の交換コード方式へ**
  (`/api/auth/line/exchange`)。履歴・Referer 経由のトークン漏洩を防止。
- AI チャット履歴の IP 紐づけ窓を **24h → 30 分**に短縮 (共有 IP での他人履歴混入を低減)。
- 口コミ重複投稿の **競合状態を部分ユニークインデックスで DB 保証**
  (`reviews_user_store_active_unique`) + 競合時の 422 ハンドリング。
- LINE 認証 / Webhook エンドポイントに **throttle** を付与。
- terraform: **SSH を `0.0.0.0/0` から「許可 CIDR 指定時のみ ingress 作成」へ**
  (デフォルトは 22 番ポート閉)。
- ai_chat_logs に `(ip_address, created_at)` インデックス追加 (上限集計のスキャン回避)。

## 次フェーズ項目の進捗

1. ✅ LINE OAuth state を cookie + random ベースへ (本追補で実装)
2. ⬜ Admin login throttle `5,15` (現状 `10,10`、要検討)
3. ⬜ Sanctum を SPA cookie モードへ (今回は交換コードでトークン漏洩面を縮小)
4. 🔸 Policy + Gate での AdminUser RBAC (今回は middleware + abilities で境界を強制。
   Policy 化は継続課題)
5. ⬜ Refresh token rotation

## 監査者・実施日

- 監査者: Claude Code (Opus 4.8) + 人手レビュー
- 初回監査: 2026-05-29 (`feat/qa-2026-05-29`)
- リリース前ハードニング: 2026-06-02 (`feat/seo-security-hardening`)
- 関連ブランチ: `feat/qa-2026-05-29`
