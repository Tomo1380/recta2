# 0002. JsonResource::withoutWrapping + PaginatorWithResource helper

- Status: accepted
- Date: 2026-05-26

## Context

ADR 0001 で Resource ベースの API 設計に移行することにしたが、
Laravel の `JsonResource` には **2 つのラップ挙動** がある:

1. 単体 / コレクションを `{ data: ... }` でラップする (デフォルト)
2. paginator + Resource Collection は `{ data, links, meta }` で
   さらにラップする

一方、Recta のフロント (`StoreListPage`, `ReviewsPage`,
`AdminUsersPage` 等) はこれまでずっと **Laravel paginator の
flat shape** (`current_page` / `total` / `last_page` を root に
持つ) を直接読む設計で動いてきた。

Resource 化したことで shape が変わると、フロント側でも
`response.data.data.total` のように二段ネストになって既存コード
全部書き換えになる。逆方向に「フロントを直す」のは影響範囲がでかい。

## Decision

**2 段階で「契約は変えない」方針を採る**:

1. `AppServiceProvider::boot()` で
   `JsonResource::withoutWrapping()` をグローバルに有効化
   (単体 Resource の `{data: ...}` 抑制)。
2. paginator + Resource は専用ヘルパ
   `App\Support\PaginatorWithResource::map($paginator, FooResource::class)`
   を経由する。内部は `$paginator->getCollection()->transform()` で
   各要素を Resource resolve に置き換えるだけで、外形 (current_page,
   total 等) は paginator のまま。

## Consequences

良い面:
- フロント側コード一切変更なしで backend だけ Resource 化できる
- 「flat shape を守る」というルールが原則 (CLAUDE.md) として明示でき、
  新規開発者が間違えにくい
- `withoutWrapping` を on にする前後で全 endpoint をテストできた

悪い面 / 制約:
- Laravel の Resource 仕様から少しズレるので、初見の人は
  「なぜラップしてないの？」と戸惑う可能性
- `PaginatorWithResource` は薄いヘルパだが「もう 1 個覚えることが
  ある」になる
- `Resource::collection($paginator)` を素直に使うとバグるので、
  ADR / docs を確実に読む文化が必要

## Alternatives considered

- **A. ラップ shape を受け入れてフロントを書き換える**
  → 影響範囲広すぎ、fragile、得るものない
- **B. paginator を使わず手で `{data, total, current_page}` 組み立てる**
  → DRY 崩壊、Resource の意味も薄れる
- **C. `Resource::collection` の自動ラップを subclass で殺す**
  → 仕様外の振る舞いで脆い、Laravel upgrade で壊れる

## Related

- 詳細は [`docs/architecture/api-design.md`](../architecture/api-design.md) §1
