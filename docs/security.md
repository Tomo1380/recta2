# Recta セキュリティ方針・ハードニングチェックリスト

- **対象環境**: `recta.isayama-dev.com`（dev 環境だが **本番相当のセキュリティを目標**）
- **最終監査**: 2026-05-31
- **監査方法**: コード精読 + 依存スキャン（`npm audit` / `composer audit`）+ HTTP ヘッダ確認
- **限界**: 静的監査中心。**動的ペンテスト（OWASP ZAP 等）は未実施**。公開規模を広げる前に一度かけると安心。

---

## 1. 現状サマリ

**致命的な脆弱性・設計欠陥は無し。** 依存ライブラリの既知脆弱性もゼロ。HTTP セキュリティヘッダは 2026-05-31 に実装・本番反映済み。残りは「あると望ましい」ハードニング項目（ブロッカーではない）。

---

## 2. 実装済み（2026-05-31 デプロイ）

`docker/nginx-prod/default.conf` の HTTPS サーバーブロックに付与：

| ヘッダ | 値 |
|---|---|
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` |
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `SAMEORIGIN`（クリックジャッキング対策） |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `geolocation=(self), camera=(), microphone=(), payment=()` |
| Content-Security-Policy | 許容寄り（`unsafe-inline` 許可）だが `object-src 'none'` / `base-uri 'self'` / `frame-ancestors 'self'` で固める |
| server_tokens | `off`（nginx バージョン秘匿） |

> ※ 静的アセットの location は独自 `add_header` を持つため、その応答だけ上記ヘッダを継承しない（nginx 仕様）。ページ/API 応答には付与されるため実害は小。

---

## 3. 監査で良好確認（対応不要）

| 項目 | 状態 |
|---|---|
| 依存脆弱性 | `npm audit` 0 件 / `composer audit` 0 件 |
| XSS | コラム本文は DOMPurify でサニタイズ（`column-detail.tsx` `transformBodyHtml`）、React 自動エスケープ、JSON-LD はサーバ生成の信頼源、CSP で多層防御 |
| SQL インジェクション | なし（Eloquent + パラメータ化。生クエリ `StoreToolRegistry` も `?` バインド） |
| IDOR | 口コミ削除は所有者チェック（`PublicReviewController`）、admin はロールチェック |
| オープンリダイレクト | LINE コールバックは相対パスのみ許可（`LineAuthController`、`//` 始まり拒否） |
| Mass assignment | 主要モデルで `$fillable` 定義 |
| 認証 | admin 全 route が `auth:sanctum`。LINE webhook は署名検証（timing-safe `hash_equals`、`LineMessagingService::verifySignature`） |
| TLS | Let's Encrypt、TLSv1.2/1.3、HTTP→HTTPS 301 |
| 秘密情報 | コードにハードコード無し、`.env` / `.env.prod` は gitignore、`APP_DEBUG=false`（prod） |
| 入力検証 | FormRequest に集約（54+ クラス）、アップロードは mime/size 検証 |

---

## 4. 残ハードニング（優先度順）

### 🔴 早めに閉じたい
- [ ] **SSH の全開放を是正** — 現在 `ssh_allowed_cidrs = ["0.0.0.0/0"]`（誰でも SSH 試行可能）。自分の IP に限定、or SSM Session Manager のみに（IAM 権限は付与済み）。
  - 実装: `terraform/terraform.tfvars` の `ssh_allowed_cidrs` / `terraform/network.tf`

### 🟡 推奨（公開直後〜早めに）
- [ ] **レート制限の追加** — アップロード（`/admin/uploads/*`）と admin CRUD（PATCH/DELETE）に `throttle` 無し。admin login は `throttle:10,10` → `5,10` 程度に。
  - 実装: `backend/routes/api.php`（`->middleware('throttle:...')`）
- [ ] **Sanctum トークン TTL 短縮** — 現在 30 日（`expiration => 43200`）。7〜14 日 + リフレッシュ検討。
  - 実装: `backend/config/sanctum.php`
- [ ] **パスワードポリシ強化** — 現在 min 8 文字。12 文字+ や複雑性ルール。
  - 実装: `backend/app/Http/Requests/Admin/StoreAdminUserRequest.php` ほか
- [ ] **画像 EXIF 除去** — アップロード画像の位置情報等メタデータを除去（プライバシー）。
  - 実装: `backend/app/Support/MediaStorage.php` / アップロード処理
- [ ] **CSP の厳格化** — 現状 `unsafe-inline`（hydration 維持のため）。nonce 方式 + `Content-Security-Policy-Report-Only` で計測→段階的に締める。
  - 実装: `docker/nginx-prod/default.conf`

### 🟢 任意 / 運用で
- [ ] 動的ペンテスト（OWASP ZAP 等）を公開前に 1 回
- [ ] WAF / fail2ban
- [ ] 秘密情報を SSM Parameter Store / Secrets Manager 化（`.env.prod` 手置きより安全）
- [ ] 死活監視 / アラート（UptimeRobot + CloudWatch: CPU/メモリ/ディスク20GB）+ エラートラッキング（Sentry）

---

## 5. 関連: SEO/OGP の本番修正（2026-05-31 同時対応）

セキュリティとは別だが同デプロイで修正済み（参考）:
- SSR loader が prod で内部 API に到達できず店舗詳細/コラム/LP の OGP・meta がフォールバックしていた不具合を修正（`INTERNAL_API_BASE_URL` 設定）。
- `/sitemap.xml`・`/robots.txt` が 404 だったのを nginx で Laravel にルーティング。
- （未デプロイ）店舗 OGP 画像が常にデフォルトになる不具合の修正をブランチに用意済み。

---

## 改訂履歴
- 2026-05-31: 初版。ヘッダ実装・依存スキャン・静的監査の結果を記録。
