# API 設計パターン

Recta の Laravel API を書くときの「型 / 形 / バリデーション」3 軸の方針。
新規 endpoint を作る前に、CLAUDE.md の「アーキテクチャ原則」+ ここを
読む。

ここは **how to** が中心。なぜそうしたかは
[../architecture-decisions/](../architecture-decisions/) の ADR 参照。

---

## 1. 形 (Response shape)

### 単体リソース

```php
public function show(Article $article): ArticleResource
{
    return new ArticleResource($article);
}
```

→ `{ id: 1, title: '...', ... }` (data wrap なし)。
`AppServiceProvider::boot()` の `JsonResource::withoutWrapping()` が効く。

### 関係を含む単体リソース

```php
public function show(Article $article): ArticleResource
{
    $article->load(['author', 'tags']);
    return new ArticleResource($article);
}
```

Resource 側で `whenLoaded` を使うことで、eager load されていないときは
キーごと省略される (= フロントで `undefined` チェックすれば良い)。

```php
// ArticleResource
'author' => $this->whenLoaded('author', function () {
    return [
        'id' => $this->author->id,
        'name' => $this->author->name,
    ];
}),
```

### paginate されたリスト ⚠️ 注意

Recta のフロントは **paginator の flat 形** (`current_page` / `total` /
`last_page` を root に持つ) を直接読むので、`Resource::collection($paginator)` は
**使わない**。これは Laravel が自動で `{data, links, meta}` にラップしてしまうから。

❌ NG:
```php
return ReviewResource::collection($reviews);
// → { data: [...], links: {...}, meta: {...} }
//   フロント: response.total が undefined になり崩壊
```

✅ OK:
```php
use App\Support\PaginatorWithResource;

return response()->json(
    PaginatorWithResource::map($reviews, ReviewResource::class),
);
// → { current_page, total, last_page, data: [...], ... }
//   フロント: response.total が直接読める
```

`PaginatorWithResource::map` は paginator の `getCollection()->transform()` で
要素だけ Resource resolve に置き換える小さなヘルパ。
`backend/app/Support/PaginatorWithResource.php` 参照。

### paginate されない単純配列

`AnonymousResourceCollection` をそのまま返してOK:

```php
public function index(): AnonymousResourceCollection
{
    return AreaResource::collection(Area::orderBy('sort_order')->get());
}
// → [ {...}, {...}, ... ]   (data ラップなし、withoutWrapping が効く)
```

### 複合 (paginator + 追加メタ)

`{ users: paginator, line_stats: {...} }` のようなレスポンス:

```php
return response()->json([
    'users' => PaginatorWithResource::map($users, UserResource::class),
    'line_stats' => [
        'total_users' => $totalUsers,
        'line_friend_count' => $lineFriendCount,
    ],
]);
```

### 配列 / オブジェクトミックスの自由形

Scramble に推論させたいので docblock で形を明示:

```php
/**
 * @response array{
 *   article: ArticleResource,
 *   related: ArticleSummaryResource[]
 * }
 */
public function show(string $slug): JsonResponse
{
    // ...
    return response()->json([
        'article' => (new ArticleResource($article))->resolve(),
        'related' => ArticleSummaryResource::collection($related)->resolve(),
    ]);
}
```

`->resolve()` を呼ぶことで、Resource 内の `whenLoaded` を実行した
配列が取れる。

---

## 2. バリデーション (Request)

### 新規コードのルール

**`$request->validate([...])` インラインは禁止**。FormRequest に切り出す。
理由:
- Scramble がリクエスト schema を OpenAPI に流せる
- 同じ endpoint で複数の同じ rule が出てこなくなる
- テストが書きやすい

### ファイル配置

| Namespace | 使う場面 |
|---|---|
| `App\Http\Requests\Admin\` | admin middleware 配下 |
| `App\Http\Requests\User\` | LINE ログイン後の user 領域 |
| (公開で auth 不要は) `App\Http\Requests\` | 直下 |

### 命名規則

- `StoreXxxRequest` — POST 新規作成
- `UpdateXxxRequest` — PUT/PATCH 更新
- `XxxActionRequest` — それ以外 (例: `ResetAdminPasswordRequest`,
  `SendLinePushRequest`)

### 共通 reorder のような操作

`App\Http\Requests\Admin\ReorderRequest` を使い回す:

```php
public function reorderAreas(ReorderRequest $request): JsonResponse
{
    foreach ($request->validated()['ids'] as $index => $id) {
        Area::where('id', $id)->update(['sort_order' => $index]);
    }
    return response()->json(['message' => 'OK']);
}
```

### Update 系での unique バリデーション

ルートパラメータの id を ignore する:

```php
public function rules(): array
{
    $id = $this->route('area')?->id ?? $this->route('area');
    return [
        'slug' => ['sometimes', 'string', Rule::unique('areas', 'slug')->ignore($id)],
    ];
}
```

---

## 3. 型 (Resource)

### いつ Resource 化するか

**しない方が良いケース** (経験則):

| ケース | 理由 |
|---|---|
| 単純テーブル (5 フィールド程度、関係なし) | Eloquent 直推論で Scramble が拾える、Resource は冗長 |
| 既に StoreApiTransformer のような flat 互換層がある | Resource とのどちらが真実か曖昧になる |
| Dashboard / stats のようなネスト広いがチャート用途 | フロントの consumer ロジックが特殊で Resource 整形が逆に重い |

**する方が良いケース**:

| ケース | 効用 |
|---|---|
| 関係を含む (whenLoaded) | 「load しないと出ない」契約を明示 |
| Boolean / int キャストが必要 | DB の `tinyint(1)` を確実に bool に正規化 |
| 公開 / admin で出すフィールドが違う | 公開向け Lite + admin 向け Full の 2 つ作れる (e.g. ArticleSummaryResource / ArticleResource) |
| 動的フィールド (shop_count 等) を append | `isset($this->xxx) ? ... : null` で明示できる |

### Resource ファイル配置

`App\Http\Resources\` 直下。`@mixin Model` で IDE 補完を効かせる:

```php
/**
 * @mixin \App\Models\Article
 */
class ArticleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [ ... ];
    }
}
```

### Full / Summary の使い分け

リスト endpoint で重い fields (body_html, JSONB 系) を返したくないとき、
`XxxSummaryResource` を別に作る:

```php
public function index(): JsonResponse
{
    $articles = Article::paginate(20);
    return response()->json(
        PaginatorWithResource::map($articles, ArticleSummaryResource::class),
    );
}

public function show(Article $article): ArticleResource
{
    return new ArticleResource($article);   // 重いやつ
}
```

### 動的フィールドの出し方

controller で `$model->shop_count = ...` のように動的に prop を生やす場合:

```php
// AreaResource
'shop_count' => isset($this->shop_count) ? (int) $this->shop_count : null,
```

`$this->whenNotNull(...)` を使うと Scramble の型推論が壊れる
(string 推論される) ため避ける。

---

## 4. 新規 endpoint 追加のフルレシピ

例: `/api/admin/banners` を作りたい。

### ステップ

1. **Migration** で `banners` テーブル作成、Model `App\Models\Banner` も
2. **Resource** `App\Http\Resources\BannerResource` を作る
3. **FormRequest** 2〜3 個 (Store / Update / [Reorder]) を
   `App\Http\Requests\Admin\` 配下に
4. **Controller** `App\Http\Controllers\Admin\BannerController` で
   - `index`: `PaginatorWithResource::map($p, BannerResource::class)`
   - `store/update`: `new BannerResource($banner)` 返却
   - `destroy`: `response()->json(null, 204)`
5. **Route** `api.php` の admin group 内に追加
6. **`npm run gen:api`** で TS 型 + axios client 自動生成
7. **フロント**: `frontend/app/components/admin/BannersPage.tsx` で
   `bannerIndex()` / `bannerStore({...})` などの生成関数を import

### コミット粒度

慣れてくれば 1 PR にまとめて OK。最初の数本は段階的に分けると
レビューしやすい:
- `feat(banner): backend (model + migration + Resource + Requests + Controller + routes)`
- `feat(banner): frontend (admin page wired to generated client)`

---

## 5. 既知の罠と回避策

[type-generation.md の Scramble 制約セクション](type-generation.md#既知の-scramble-制約-と回避策)
に細かい話があるが、最低限おさえるべきは:

1. **paginator + Resource は wrap される** → `PaginatorWithResource::map`
2. **`AnonymousResourceCollection` 経由は Scramble が型を見ない**
   → 戻り型を `JsonResponse` にして `@response array{...}` で形を明示
3. **`response()->json([...])` で生配列を返すと Scramble は unknown**
   → 必要なら `@response array{...}` で形を補う

---

## 6. 移行マトリクスと残課題

進捗・残課題は [type-generation.md の移行マトリクス](type-generation.md#移行マトリクス-2026-05-26-時点)
が真実のソース。
