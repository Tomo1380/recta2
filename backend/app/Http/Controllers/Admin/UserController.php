<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Admin\Concerns\SortsListByDate;
use App\Http\Requests\Admin\SendUserLineMessageRequest;
use App\Http\Requests\Admin\UpdateUserNotesRequest;
use App\Http\Requests\Admin\UpdateUserStatusRequest;
use App\Http\Resources\LineFriendResource;
use App\Http\Resources\LineMessageResource;
use App\Http\Resources\UserResource;
use App\Models\AiChatLog;
use App\Models\LineFriend;
use App\Models\LineMessage;
use App\Models\PersonProfile;
use App\Models\User;
use App\Services\LineMessagingService;
use App\Support\PaginatorWithResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    use SortsListByDate;

    /**
     * @response array{
     *   users: array{
     *     data: UserResource[],
     *     current_page: int,
     *     last_page: int,
     *     per_page: int,
     *     total: int
     *   },
     *   line_stats: array{total_users: int, line_friend_count: int}
     * }
     */
    /**
     * 「LINE 利用者」一覧。大事なのは LINE トーク (公式アカウント) 側なので、
     * line_user_id を軸にしたトーク相手 (LineFriend) を主役にする (2026-06-06 FB)。
     * LINE ログイン (User) は付随属性として添える。
     *
     * mode: 'talk' (既定: トーク相手のみ) | 'login_only' (ログインのみ・未トーク)
     *       | 'all' (両方)
     *
     * @response array{people: array{data: array<int, mixed>, current_page: int, last_page: int, per_page: int, total: int}, stats: array{talk_count: int, login_only_count: int, total_users: int}}
     */
    public function index(Request $request): JsonResponse
    {
        $mode = $request->input('mode', 'talk');
        $search = trim((string) $request->input('search', ''));
        $perPage = (int) $request->input('per_page', 20);

        // CRM 属性での絞り込み (進捗 / 上京希望)。person_profiles は line_user_id 軸
        // なので、該当する line_user_id 群を集めて両クエリを whereIn で制限する。
        // ※「未対応(none)」は profile 行が無い人も含むため絞り込み対象外 (=全件扱い)。
        $placement = (string) $request->input('placement_status', '');
        $wantsReloc = $request->has('wants_relocation') ? $request->boolean('wants_relocation') : null;
        $profileFilterIds = null;
        if (($placement !== '' && $placement !== 'none' && $placement !== 'all') || $wantsReloc === true) {
            $pq = PersonProfile::query();
            if ($placement !== '' && $placement !== 'none' && $placement !== 'all') {
                $pq->where('placement_status', $placement);
            }
            if ($wantsReloc === true) {
                $pq->where('wants_relocation', true);
            }
            $profileFilterIds = $pq->pluck('line_user_id');
        }

        // LineFriend → 正規化 people 行 (トーク主役)
        $normFriend = fn (LineFriend $f): array => [
            'line_user_id' => $f->line_user_id,
            'name' => $f->admin_name ?: $f->display_name ?: $f->user?->nickname ?: $f->user?->line_display_name ?: null,
            'display_name' => $f->display_name,
            'picture_url' => $f->picture_url ?: $f->user?->line_picture_url,
            'is_following' => (bool) $f->is_following,
            'messages_count' => (int) ($f->messages_count ?? 0),
            'user_id' => $f->user_id,
            'has_account' => ! is_null($f->user_id),
            'status' => $f->user?->status,
            'reviews_count' => $f->user && $f->user->reviews_count !== null ? (int) $f->user->reviews_count : null,
            'last_activity' => optional($f->updated_at)->toIso8601String(),
            'kind' => 'talk',
        ];

        // User (未トーク) → 正規化 people 行
        $normUser = fn (User $u): array => [
            'line_user_id' => $u->line_user_id,
            'name' => $u->nickname ?: $u->line_display_name ?: null,
            'display_name' => $u->line_display_name,
            'picture_url' => $u->line_picture_url,
            'is_following' => false,
            'messages_count' => 0,
            'user_id' => $u->id,
            'has_account' => true,
            'status' => $u->status,
            'reviews_count' => (int) ($u->reviews_count ?? 0),
            'last_activity' => optional($u->created_at)->toIso8601String(),
            'kind' => 'login_only',
        ];

        $friendQuery = function () use ($search, $profileFilterIds) {
            $q = LineFriend::query()
                ->with(['user' => fn ($u) => $u->withCount(['reviews' => fn ($r) => $r->where('status', 'published')])])
                ->withCount('messages');
            if ($profileFilterIds !== null) {
                $q->whereIn('line_user_id', $profileFilterIds);
            }
            if ($search !== '') {
                $q->where(function ($w) use ($search) {
                    $w->where('display_name', 'ilike', "%{$search}%")
                      ->orWhere('admin_name', 'ilike', "%{$search}%")
                      ->orWhere('line_user_id', 'ilike', "%{$search}%")
                      ->orWhereHas('user', fn ($u) => $u
                          ->where('line_display_name', 'ilike', "%{$search}%")
                          ->orWhere('nickname', 'ilike', "%{$search}%"));
                });
            }
            return $q;
        };

        $loginOnlyQuery = function () use ($search, $profileFilterIds) {
            $q = User::query()
                ->whereDoesntHave('lineFriend')
                ->withCount(['reviews' => fn ($r) => $r->where('status', 'published')]);
            if ($profileFilterIds !== null) {
                $q->whereIn('line_user_id', $profileFilterIds);
            }
            if ($search !== '') {
                $q->where(function ($w) use ($search) {
                    $w->where('line_display_name', 'ilike', "%{$search}%")
                      ->orWhere('nickname', 'ilike', "%{$search}%")
                      ->orWhere('admin_notes', 'ilike', "%{$search}%");
                });
            }
            return $q;
        };

        if ($mode === 'login_only') {
            $people = $loginOnlyQuery()->orderByDesc('created_at')->paginate($perPage)->through($normUser);
        } elseif ($mode === 'all') {
            // 管理規模なので in-memory マージ (上限 500)。最終アクティビティ順。
            $friends = $friendQuery()->orderByDesc('updated_at')->limit(500)->get()->map($normFriend);
            $logins = $loginOnlyQuery()->orderByDesc('created_at')->limit(500)->get()->map($normUser);
            $merged = $friends->concat($logins)->sortByDesc('last_activity')->values();
            $page = (int) $request->input('page', 1);
            $people = new \Illuminate\Pagination\LengthAwarePaginator(
                $merged->forPage($page, $perPage)->values(),
                $merged->count(),
                $perPage,
                $page,
                ['path' => $request->url(), 'query' => $request->query()],
            );
        } else { // talk (default)
            $people = $friendQuery()->orderByDesc('updated_at')->paginate($perPage)->through($normFriend);
        }

        // 各 people 行に、ページ分の付随情報をまとめて付与 (line_user_id 基準・各1クエリ)。
        //  - ai_chat_count: AIチャット利用数 (アクティブ度の目安)
        //  - placement_status / wants_relocation / interested_area: CRM 属性 (進捗・上京・エリア)
        $lineIds = collect($people->items())->pluck('line_user_id')->filter()->unique()->values();
        $chatCounts = $lineIds->isEmpty()
            ? collect()
            : AiChatLog::whereIn('line_user_id', $lineIds)
                ->selectRaw('line_user_id, count(*) as c')
                ->groupBy('line_user_id')
                ->pluck('c', 'line_user_id');
        $profiles = $lineIds->isEmpty()
            ? collect()
            : PersonProfile::whereIn('line_user_id', $lineIds)->get()->keyBy('line_user_id');
        $people->getCollection()->transform(function ($row) use ($chatCounts, $profiles) {
            $lid = $row['line_user_id'] ?? '';
            $profile = $profiles->get($lid);
            $row['ai_chat_count'] = (int) ($chatCounts[$lid] ?? 0);
            $row['placement_status'] = $profile->placement_status ?? 'none';
            $row['wants_relocation'] = (bool) ($profile->wants_relocation ?? false);
            $row['interested_area'] = $profile->interested_area ?? null;
            return $row;
        });

        return response()->json([
            'people' => $people,
            'stats' => [
                'talk_count' => LineFriend::where('is_following', true)->count(),
                'login_only_count' => User::whereDoesntHave('lineFriend')->count(),
                'total_users' => User::count(),
            ],
        ]);
    }

    /**
     * @response array{user: UserResource, line_messages: LineMessageResource[]}
     */
    public function show(User $user): JsonResponse
    {
        $user->load([
            'reviews' => fn ($q) => $q
                ->select(['id', 'user_id', 'store_id', 'rating', 'body', 'status', 'created_at', 'updated_at'])
                ->with('store:id,name')
                ->latest()
                ->limit(20),
            'lineFriend',
        ])->loadCount('reviews');

        $lineMessages = collect();
        if ($user->lineFriend) {
            $lineMessages = LineMessage::where('line_user_id', $user->line_user_id)
                ->orderByDesc('created_at')
                ->limit(5)
                ->get();
        }

        return response()->json([
            'user' => (new UserResource($user))->resolve(),
            'line_messages' => LineMessageResource::collection($lineMessages)->resolve(),
        ]);
    }

    public function updateStatus(UpdateUserStatusRequest $request, User $user): UserResource
    {
        $user->update(['status' => $request->validated()['status']]);
        return new UserResource($user);
    }

    public function updateNotes(UpdateUserNotesRequest $request, User $user): UserResource
    {
        $user->update(['admin_notes' => $request->validated()['admin_notes'] ?? null]);
        return new UserResource($user);
    }

    /**
     * Send a LINE push message to a user via their line_user_id.
     *
     * @response array{message: string}
     */
    public function sendLineMessage(SendUserLineMessageRequest $request, User $user, LineMessagingService $lineService): JsonResponse
    {
        if (!$user->line_user_id) {
            return response()->json(['message' => 'このユーザーにはLINE IDが紐付けられていません'], 422);
        }

        $friend = $user->lineFriend;
        if (!$friend || !$friend->is_following) {
            return response()->json(['message' => 'このユーザーはLINE友だちではないためメッセージを送信できません'], 422);
        }

        $messageText = $request->validated()['message'];
        $messages = [['type' => 'text', 'text' => $messageText]];

        $result = $lineService->pushMessage($user->line_user_id, $messages);

        if (!$result['success']) {
            return response()->json([
                'message' => 'メッセージの送信に失敗しました',
                'details' => $result['body'],
            ], 422);
        }

        LineMessage::create([
            'line_user_id' => $user->line_user_id,
            'user_id' => $user->id,
            'direction' => 'outbound',
            'message_type' => 'text',
            'content' => $messageText,
        ]);

        return response()->json(['message' => '送信しました']);
    }

    /**
     * Get paginated LINE messages for a user.
     */
    public function messages(Request $request, User $user): JsonResponse
    {
        $friend = $user->lineFriend;

        $messages = LineMessage::where('line_user_id', $user->line_user_id)
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 50));

        return response()->json([
            'friend' => $friend ? [
                'id' => $friend->id,
                'line_user_id' => $friend->line_user_id,
                'display_name' => $user->line_display_name,
                'picture_url' => $user->line_picture_url,
                'is_following' => (bool) $friend->is_following,
                'followed_at' => $friend->followed_at?->toIso8601String(),
                'user' => (new UserResource($user))->resolve(),
            ] : null,
            'messages' => PaginatorWithResource::map($messages, LineMessageResource::class),
        ]);
    }
}
