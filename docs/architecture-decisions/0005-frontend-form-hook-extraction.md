# 0005. Frontend form hook extraction (useShopForm pattern)

- Status: accepted
- Date: 2026-05-27

## Context

`refactor/debt-cleanup` ブランチの Phase 3 で、fat フロントコンポーネントの
状態管理ロジックを hook に切り出した。

Before:
- `frontend/app/components/admin/ShopEditPage.tsx`: 3314 行 / 88 useState
- `populateFromStore` (200 行) と `buildPayload` (240 行) が component の
  内側で inline で書かれており、Unit テストが書けない
- 画像 upload/delete とステップ管理が他の form state と混ざっている

## Decision

Phase 3 では「**ロジックを純粋関数 + hook に切り出す**」を優先する。
component 自体の DOM 構造分割 (ShopEditPage を 5 step component に解体)
は別タスクとして扱う。

### 抽出した hook

- `frontend/app/hooks/useShopImages.ts`
  - `images / setImages / upload / remove / uploading / error`
  - storeId が null (新規店舗) のとき upload を拒否してエラー文を返す
- `frontend/app/hooks/useStepProgression.ts`
  - `currentStep / completedSteps / next / prev / goTo`
  - `computeProgress(filledFlags)`: completed + filled を OR して
    visited Set と進捗率を返す (BUG-010 対応のロジックを保存)
- `frontend/app/hooks/useShopForm.ts`
  - `ShopForm` interface (78 field を 1 つの型に)
  - `INITIAL_FORM` 定数
  - `useShopForm()` hook (useReducer ベース)
  - `storeToForm(store): Partial<ShopForm>` (旧 populateFromStore のロジック)
  - `formToPayload(form, extras)` (旧 buildPayload のロジック)

### 残った設計上の妥協

ShopEditPage は依然 88 useState を持つ。`storeToForm` / `formToPayload` は
純粋関数として独立して動くが、ShopEditPage 内では従来通り個別 useState 経由
で値を保持し、wrapper 関数で hook の純粋関数を呼ぶ形に留めた。

これは、各 step (Step1〜Step5) を render する JSX 内で `setShopName(...)` 等
を直接呼ぶ箇所が 200 箇所以上あり、これらを全て `setField("shopName", ...)`
に置換するには **書き直しに近い規模** になるため。Phase 3 のスコープでは
「リファクタリング」の範疇を超えるので別タスクに分けた。

## Consequences

### Good
- 旧 240 行の inline buildPayload と 200 行の inline populateFromStore が
  hook 内純粋関数に移管され、Unit テスト可能になった (Phase 3 で 35 件追加)。
- 画像 upload/delete のロジックが ShopEditPage から切り離され、storeId
  null 時のエラーメッセージなど特殊ケースが hook 単位でテストできる。
- BUG-013 (単位込み trial_avg_hourly) や BUG-010 (進捗バー初期 0%) のような
  業務ロジックが純粋関数のテストとして保存され、リグレッションを検知できる。

### Bad
- ShopEditPage の 88 useState はそのまま残っており、render 内で setter を
  直接呼んでいる構造も変わっていない。「fat ファイル問題」の本丸は未解決。

### Neutral
- 将来 `ShopCreatePage` を独立 route として作る場合、`useShopForm` を
  そのまま再利用できる土台になっている。`isNew` 分岐の廃止は
  ShopEditPage 本体の書き直しと同じタスクで進める。
- Phase 3 で予定していた他項目はすべて deferred:
  - `lib/api.ts` の orval mutator 化: api.ts は動いており、公開シグネチャを
    変えずに置き換えるには影響範囲が広い。価値対比でリスク高。
  - loader/action 移行: リファクタリングというより SSR 設計の追加なので
    別途検討。
  - AdminUsersPage / UsersPage 統合: 独立スコープ。

## References

- 関連 commit (refactor/debt-cleanup):
  - fed05d5 useShopImages
  - 1e0a2e8 useStepProgression
  - a57fa6d useShopForm + storeToForm/formToPayload
  - 0b8c2c7 ShopEditPage 内 any: 70 -> 0
- tag: `refactor-phase-3`, `refactor-phase-4`
