# 0001. Type generation stack — dedoc/scramble + orval

- Status: accepted
- Date: 2026-05-26

## Context

Recta は backend (Laravel) と frontend (React Router v7 + TypeScript)
で完全な型の二重管理になっていた。`frontend/app/lib/types.ts` は 411
行手書きで、Laravel 側の Eloquent モデル / response 形と常に整合を
取らないといけない。

具体的な痛み:
- migration でカラム追加した時、types.ts に追記し忘れて runtime まで
  気付かない
- JSONB 内の構造変更 (`champagne_prices`, `transfer_zones` 等) で
  毎回 fragile な手作業
- 「この endpoint は何返すんだっけ」を毎回 controller 読みに行く

Profiit (同チームの別プロジェクト) で `dedoc/scramble` + `orval` の
組み合わせを使っており、運用が回っているのを観察した。

選択肢として A) この Profiit と同スタック、B) Spatie laravel-data +
typescript-transformer、C) ランタイム Zod だけ、D) 何もしない、を
評価した。

## Decision

A. **`dedoc/scramble` + `orval` を Recta にも導入**する。

理由:
- Profiit と揃えることで知見・学習コストが共有できる
- Scramble は **アノテーションほぼ不要** で Eloquent + Controller の
  typed signature から自動推論する。最小コストで動き始められる
- orval は `axios-functions` client + per-tag ファイル分割が綺麗で
  React/Vite と相性が良い
- 既存 `frontend/app/lib/api.ts` (Bearer token 付与) と並行運用が
  可能 (生成 client の mutator も同じ token 戦略で書ける)

## Consequences

良い面:
- backend を真実のソースにできる。`npm run gen:api` 1 発で TS 型と
  axios 関数が再生成される
- PR 差分で「API がどう変わったか」が `frontend/orval/generated/` の
  diff で一目になる
- `backend/api.json` も git 管理することで CI で「型生成漏れ」を
  検知できる将来余地

悪い面 / 制約:
- Scramble は `AnonymousResourceCollection` のような Laravel の
  ラッパー型を綺麗に推論しきれない場合がある (ADR 0002 / 0003 参照)
- 生成ファイル (≒数千行) を git に入れることに対する好みは分かれる
  (Profiit と同方針で「入れる」を採用)
- Vite の optimizeDeps が axios 追加で再計算され、cache を壊してから
  再起動が必要だった (運用 tip として docs に残した)

## Related

- ADR 0002 — Resource wrapping を無効化した経緯
- ADR 0003 — Wave 6 (Dashboard) / Wave 7 (Store) を意図的に保留した理由
- 詳細運用は [`docs/architecture/type-generation.md`](../architecture/type-generation.md)
