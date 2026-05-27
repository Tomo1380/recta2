# 0003. Deferred Resource-ification of Dashboard and Store

- Status: superseded (Phase 1-5, 2026-05-27)
- Date: 2026-05-26
- Superseded by: refactor/debt-cleanup ブランチの Phase 1-5

> **Update (2026-05-27)**: 本 ADR の Wave 7 (Store) は refactor/debt-cleanup
> ブランチの Phase 1-5 で解消された。`StoreApiTransformer` を削除し、
> `StoreResource` に flat shape 生成ロジックを移管。フロント互換性は
> 既存 Feature テスト 164 件で担保。Wave 6 (Dashboard) は現状の独自
> shape (`kpis/chat_trend/...`) で安定しており、AdminDashboardTest で
> snapshot 化済みのため Phase 2/3 以降に持ち越し。

## Context

ADR 0001 で全 endpoint を Resource ベースに移行する方針にした。
2026-05-26 のスプリントで Wave 0〜5 (RelocateVoice, Area, Category,
PickupShop, Consultation, Banner, Article, Review, LineFriend,
LineMessage, AdminUser, User) を完了したが、残り 2 ドメインだけ
**意図的に保留**にした:

- Wave 6: AiChatSetting / DashboardData
- Wave 7: Store

これがなぜか、後から「なんで Resource 化されてないの？」と聞かれた
時に答えられるよう、判断根拠を残す。

## Decision

両 Wave を当面 Resource 化しない。

### Wave 6 (Dashboard) を後回しにした理由

`AdminDashboardController` は以下を一つの JSON で返す:

- KPI (user_count, store_count, ...) + delta
- chart trend points (daily 30 日分)
- distribution points
- recent_reviews / recent_messages / recent_chats
- 各種 sub-stats (LINE 友達数、AI chat tokens 統計、...)

これは Resource 1 つで包めない (本来 BFF 的なビュー)。仮に
`DashboardResource` を作っても 200 行超のネスト構造の写経になり、
フロント側 (`DashboardPage`) の recharts 描画ロジックが既にこの
形に依存しているので、Resource 化しても得る型情報は **既に手書きで
存在する** ものと同じ。投資対効果が低い。

### Wave 7 (Store) を後回しにした理由

Store 周りには `App\Support\StoreApiTransformer` という 270 行の
レガシー flat 互換層が間に挟まっている。これは:

- フロント側 (`lib/types.ts.Store`, `StoreDetailPage`, `StoreListPage` 等)
  が flat field 名 (`hourly_min`, `business_hours`, `opening_time`)
  を期待してる
- backend の新スキーマ (JSONB: `wage.regular.min`, `schedule.open` 等)
  との橋渡しが transformer の役目

これを Resource に置き換えるには、Resource 内で transformer と同じ
flat 名一覧を再現するか、フロント側を新スキーマ式に書き直すか、
どちらかが必要。

- 前者は「Resource なのか transformer なのか」が曖昧になる
- 後者は 5 ファイルの大規模書き直し + リスク大
- 既存 transformer は安定動作しており、緊急性ない

「StoreApiTransformer 自体をやり直すタイミング」になったときに
セットで Wave 7 を回す方が筋良い。

## Consequences

良い面:
- スプリント内で「やる価値の高いもの」だけ通せた
- Dashboard / Store はそれぞれ難所だが、無理に Resource 化して
  雑な仕事するよりは「やらない」と意識的に選ぶ方が健全
- 判断根拠が ADR に残るので、後から「なんで途中で止まってるの？」
  と疑われない

悪い面:
- 「型生成パイプライン完全勝利！」とはならず、半分手書きが残る
- Dashboard / Store を触るときに「ここは新ルールに合わない」と
  説明が要る (この ADR が答え)
- 将来 Store API スキーマ変更時に、transformer 経由か Resource か
  迷う可能性 → その時にこの ADR を再評価する

## Trigger for revisit

- Dashboard: stats を BFF として分離したくなったとき
  (例: モバイル admin app を作るタイミング)
- Store: `StoreApiTransformer` をリファクタすることになったとき
  (新フィールド追加で transformer が痛くなったタイミング)

## Related

- ADR 0001 — そもそも Resource 化に踏み切った経緯
- ADR 0002 — Resource wrapping を無効化した経緯
- [`docs/architecture/type-generation.md`](../architecture/type-generation.md) §移行マトリクス
