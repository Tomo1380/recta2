# Recta2 docs

`docs/` 直下は「日々の開発・運用で参照する永続ドキュメント」。
履歴・一発もの・過去スナップショットは [`archive/`](archive/) に隔離。

## ドキュメントインデックス

### 仕様・要件

| ファイル | 内容 |
|---|---|
| [admin-panel-requirements.md](admin-panel-requirements.md) | 管理画面全 10 ページの機能要件・ページ別仕様 |
| [ai-chat-architecture.md](ai-chat-architecture.md) | AI チャット 3 モード (Agent / FT-OpenAI / FT-Gemini) のアーキテクチャ・プロンプト構造・ツール定義 |

### アーキテクチャ・設計パターン

| ファイル | 内容 |
|---|---|
| [architecture/api-design.md](architecture/api-design.md) | Laravel API 設計の「型・形・バリデーション」3 軸の指針。新規 endpoint を書く前に必読 |
| [architecture/type-generation.md](architecture/type-generation.md) | Laravel → OpenAPI → TS 型・axios クライアント自動生成パイプライン (scramble + orval)。詳細運用・移行マトリクス |
| [architecture-decisions/](architecture-decisions/) | ADR (Architecture Decision Records)。「なぜそうしたか」の経緯。`0001-type-generation-stack.md` 等 |

### 運用・チェックリスト

| ファイル | 内容 |
|---|---|
| [deploy-aws.md](deploy-aws.md) | AWS EC2 シングルインスタンス構成 + Terraform + デプロイフロー |
| [line-setup-checklist.md](line-setup-checklist.md) | LINE Login / Messaging API のチャネル設定・ENV・Webhook + トラブル履歴 |
| [ai-finetuning.md](ai-finetuning.md) | OpenAI Fine-tuning の v1〜v4 履歴・モデル ID 管理・訓練データの作り方 |

### テスト

| ファイル | 内容 |
|---|---|
| [qa-prompts.md](qa-prompts.md) | Claude/Playwright モンキーテスト用プロンプト集 (シナリオ A / 境界 B / 認証 C) + 運用 Tip + 履歴 |
| [ai-chat-test-questions.md](ai-chat-test-questions.md) | AI チャットの回帰テスト用 Q&A 57 件 (DB知識 / 一般知識 / LINE誘導 / NG) |

### セキュリティ

| ファイル | 内容 |
|---|---|
| [security-audit-2026-05-29.md](security-audit-2026-05-29.md) | 2026-05-29 時点の OWASP Top 10 観点監査結果。High 3 件 (DOMPurify, Sanctum TTL, AdminUser RBAC) 修正済み、Medium 3 件は次フェーズ |

### 変更履歴

| ファイル | 内容 |
|---|---|
| [changelog.md](changelog.md) | Keep a Changelog 形式の日付逆順リリース履歴 |

### Archive

| ファイル | なぜ archive 行きか |
|---|---|
| [archive/claude-design-handoff.md](archive/claude-design-handoff.md) | デザインツールに一度渡したら終わりの仕様書 |
| [archive/figma-make-prompt.md](archive/figma-make-prompt.md) | 管理画面 UI 生成プロンプト (一発で使い切り) |
| [archive/qa-report.md](archive/qa-report.md) | 2026-05-10 時点の QA スナップショット |
| [archive/qa-fix-report.md](archive/qa-fix-report.md) | 上の QA への対応記録 |
| [archive/release-plan.md](archive/release-plan.md) | プレリリース期のスコープ計画 |
| [archive/release-notes-2026-05-25.md](archive/release-notes-2026-05-25.md) | 砂山さん向け LINE 報告草稿 (今後は [changelog.md](changelog.md) に集約) |

## 新しいドキュメントを追加するときの判断

- **日々の開発で複数回参照する** → `docs/` 直下
- **一度書いたら次に開くか分からない / 過去のある時点のスナップショット** →
  `docs/archive/`
- **コミットメッセージや PR で済む粒度** → そもそも書かない
- **コードのコメントで済む粒度** → ファイル冒頭に書く
- **時系列の変更履歴** → `docs/changelog.md` に Unreleased セクション追記

`docs/` を「常に開きうるリファレンスだけ」に保てるかが、後から参加する
人 / 半年後の自分にとっての可読性を決める。
