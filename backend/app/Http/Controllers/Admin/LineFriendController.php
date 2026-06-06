<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SendLineBroadcastRequest;
use App\Http\Requests\Admin\SendLinePushRequest;
use App\Http\Resources\LineFriendResource;
use App\Http\Resources\LineMessageResource;
use App\Models\LineFriend;
use App\Models\LineMessage;
use App\Models\User;
use App\Services\LineMessagingService;
use App\Support\PaginatorWithResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
class LineFriendController extends Controller
{
    public function __construct(
        private LineMessagingService $lineService,
    ) {}

    /**
     * Paginated friends list with user info.
     *
     * @response array{
     *   data: LineFriendResource[],
     *   current_page: int,
     *   last_page: int,
     *   per_page: int,
     *   total: int
     * }
     */
    public function index(Request $request): JsonResponse
    {
        $query = LineFriend::with('user')
            ->withCount('messages');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('display_name', 'ilike', "%{$search}%")
                  ->orWhere('line_user_id', 'ilike', "%{$search}%");
            });
        }

        if ($request->has('is_following')) {
            $query->where('is_following', $request->boolean('is_following'));
        }

        $friends = $query->orderByDesc('updated_at')
            ->paginate($request->input('per_page', 20));

        return response()->json(PaginatorWithResource::map($friends, LineFriendResource::class));
    }

    /**
     * Paginated message history for a specific LINE user, with the friend record.
     *
     * @response array{
     *   friend: ?LineFriendResource,
     *   messages: array{
     *     data: LineMessageResource[],
     *     current_page: int,
     *     last_page: int,
     *     per_page: int,
     *     total: int
     *   }
     * }
     */
    public function messages(Request $request, string $lineUserId): JsonResponse
    {
        $messages = LineMessage::where('line_user_id', $lineUserId)
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 50));

        $friend = LineFriend::where('line_user_id', $lineUserId)
            ->with('user')
            ->first();

        return response()->json([
            'friend' => $friend ? (new LineFriendResource($friend))->resolve() : null,
            'messages' => PaginatorWithResource::map($messages, LineMessageResource::class),
        ]);
    }

    /**
     * Send a push message to a specific user.
     *
     * @response array{message: string}
     */
    public function push(SendLinePushRequest $request): JsonResponse
    {
        $lineUserId = $request->validated()['line_user_id'];
        $messageText = $request->validated()['message'];

        $messages = [['type' => 'text', 'text' => $messageText]];
        $result = $this->lineService->pushMessage($lineUserId, $messages);

        if (!$result['success']) {
            return response()->json([
                'message' => 'メッセージの送信に失敗しました',
                'details' => $result['body'],
            ], 422);
        }

        $friend = LineFriend::where('line_user_id', $lineUserId)->first();
        LineMessage::create([
            'line_user_id' => $lineUserId,
            'user_id' => $friend?->user_id,
            'direction' => 'outbound',
            'message_type' => 'text',
            'content' => $messageText,
        ]);

        return response()->json(['message' => '送信しました']);
    }

    /**
     * 人物詳細 (line_user_id 基準)。トーク相手 (LineFriend) を主に、LINEログイン
     * (User) があれば口コミ等を添える。友だちのみの相手でも詳細が見られる
     * (2026-06-06 FB)。
     *
     * @response array{person: mixed}
     */
    public function show(string $lineUserId): JsonResponse
    {
        $friend = LineFriend::where('line_user_id', $lineUserId)->with('user')->first();
        $user = $friend?->user ?? User::where('line_user_id', $lineUserId)->first();

        if (! $friend && ! $user) {
            abort(404);
        }

        // 詳細を開くたびに、フォロー中の相手は Messaging API で LINE 名・アイコンを
        // 取り直して最新化する (2026-06-07 FB)。フォロー中＝公式アカウント追加済みなので
        // LINE ログイン未連携でも取得できる。admin_name (管理用の別名) は触らない。
        if ($friend && $friend->is_following) {
            $profile = $this->lineService->getProfile($friend->line_user_id);
            if ($profile && ! empty($profile['display_name'])) {
                $friend->update([
                    'display_name' => $profile['display_name'],
                    'picture_url' => $profile['picture_url'] ?? $friend->picture_url,
                ]);
            }
        }

        $reviews = [];
        $reviewsCount = 0;
        if ($user) {
            $reviewsCount = $user->reviews()->where('status', 'published')->count();
            $reviews = $user->reviews()
                ->with('store:id,name')
                ->latest()
                ->limit(20)
                ->get(['id', 'user_id', 'store_id', 'rating', 'body', 'status', 'created_at']);
        }

        $messagesTotal = LineMessage::where('line_user_id', $lineUserId)->count();
        $messages = LineMessage::where('line_user_id', $lineUserId)
            ->orderByDesc('created_at')->limit(5)->get();

        // この人 (ログイン済 User) の AIチャット履歴。チャットは user_id に紐づくので
        // ログインしている人だけ取れる (2026-06-07 FB)。
        $aiChats = [];
        if ($user) {
            $aiChats = \App\Models\AiChatLog::where('user_id', $user->id)
                ->orderByDesc('created_at')
                ->limit(20)
                ->get(['id', 'user_message', 'ai_response', 'mode', 'page_type', 'input_tokens', 'output_tokens', 'created_at'])
                ->map(fn ($l) => [
                    'id' => $l->id,
                    'user_message' => $l->user_message,
                    'ai_response' => $l->ai_response,
                    'mode' => $l->mode,
                    'page_type' => $l->page_type,
                    'total_tokens' => (int) $l->input_tokens + (int) $l->output_tokens,
                    'created_at' => $l->created_at?->toIso8601String(),
                ])
                ->all();
        }

        $adminName = $friend?->admin_name;
        $displayName = $friend?->display_name ?: $user?->line_display_name;

        return response()->json([
            'person' => [
                'line_user_id' => $lineUserId,
                'name' => $adminName ?: $displayName ?: $user?->nickname ?: null,
                'admin_name' => $adminName,
                'display_name' => $displayName,
                'picture_url' => $friend?->picture_url ?: $user?->line_picture_url,
                'is_following' => (bool) ($friend?->is_following ?? false),
                'is_talk' => (bool) $friend,
                'has_account' => (bool) $user,
                'admin_notes' => $friend?->admin_notes ?? $user?->admin_notes,
                'user' => $user ? [
                    'id' => $user->id,
                    'status' => $user->status,
                    'line_display_name' => $user->line_display_name,
                    'nickname' => $user->nickname,
                    'reviews_count' => $reviewsCount,
                    'created_at' => $user->created_at?->toIso8601String(),
                ] : null,
                'reviews' => $reviews,
                'ai_chats' => $aiChats,
                'messages' => LineMessageResource::collection($messages)->resolve(),
                'messages_total' => $messagesTotal,
            ],
        ]);
    }

    /**
     * 管理用の表示名 (admin_name) を更新。LINE 本来の名前 (display_name) は触らない。
     * トーク相手は LineFriend に、ログインのみの相手は User.nickname に書く。
     */
    public function updateName(Request $request, string $lineUserId): JsonResponse
    {
        $name = $request->validate(['admin_name' => ['nullable', 'string', 'max:100']])['admin_name'] ?: null;
        $this->writeAdminField($lineUserId, ['admin_name' => $name], ['nickname' => $name]);
        return $this->show($lineUserId);
    }

    /**
     * 管理メモ (admin_notes) を更新。トーク相手は LineFriend に、ログインのみは User に書く。
     */
    public function updateNotes(Request $request, string $lineUserId): JsonResponse
    {
        $notes = $request->validate(['admin_notes' => ['nullable', 'string', 'max:2000']])['admin_notes'] ?: null;
        $this->writeAdminField($lineUserId, ['admin_notes' => $notes], ['admin_notes' => $notes]);
        return $this->show($lineUserId);
    }

    /**
     * 管理メタデータの書き込み先を決める: トーク相手(LineFriend) があればそこ、
     * 無くてログインユーザーがあれば User、どちらも無ければ新規 LineFriend を作る。
     *
     * @param  array<string, mixed>  $friendFields
     * @param  array<string, mixed>  $userFields
     */
    private function writeAdminField(string $lineUserId, array $friendFields, array $userFields): void
    {
        $friend = LineFriend::where('line_user_id', $lineUserId)->first();
        if ($friend) {
            $friend->update($friendFields);
            return;
        }
        $user = User::where('line_user_id', $lineUserId)->first();
        if ($user) {
            $user->update($userFields);
            return;
        }
        LineFriend::create(array_merge(['line_user_id' => $lineUserId, 'is_following' => false], $friendFields));
    }

    /**
     * Broadcast message to all friends.
     *
     * @response array{message: string}
     */
    public function broadcast(SendLineBroadcastRequest $request): JsonResponse
    {
        $messageText = $request->validated()['message'];

        $messages = [['type' => 'text', 'text' => $messageText]];
        $result = $this->lineService->broadcastMessage($messages);

        if (!$result['success']) {
            return response()->json([
                'message' => 'ブロードキャストの送信に失敗しました',
                'details' => $result['body'],
            ], 422);
        }

        LineMessage::create([
            'line_user_id' => 'broadcast',
            'user_id' => null,
            'direction' => 'outbound',
            'message_type' => 'text',
            'content' => $messageText,
        ]);

        return response()->json(['message' => '配信しました']);
    }
}
