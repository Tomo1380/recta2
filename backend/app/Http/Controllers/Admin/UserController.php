<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Admin\Concerns\SortsListByDate;
use App\Http\Requests\Admin\SendUserLineMessageRequest;
use App\Http\Requests\Admin\UpdateUserNotesRequest;
use App\Http\Requests\Admin\UpdateUserStatusRequest;
use App\Http\Resources\LineMessageResource;
use App\Http\Resources\UserResource;
use App\Models\LineMessage;
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
    public function index(Request $request): JsonResponse
    {
        $query = User::with('lineFriend');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('line_display_name', 'ilike', "%{$search}%")
                  ->orWhere('admin_notes', 'ilike', "%{$search}%");
            });
        }
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }
        $lineStatus = $request->input('line_status');
        if ($lineStatus === 'friend') {
            $query->whereHas('lineFriend', fn ($q) => $q->where('is_following', true));
        } elseif ($lineStatus === 'not_friend') {
            $query->where(function ($q) {
                $q->whereDoesntHave('lineFriend')
                  ->orWhereHas('lineFriend', fn ($sub) => $sub->where('is_following', false));
            });
        }

        $query->withCount(['reviews' => fn ($q) => $q->where('status', 'published')]);
        $users = $this->applyListSort($query, $request)
            ->paginate($request->input('per_page', 20));

        $totalUsers = User::count();
        $lineFriendCount = User::whereHas('lineFriend', fn ($q) => $q->where('is_following', true))->count();

        return response()->json([
            'users' => PaginatorWithResource::map($users, UserResource::class),
            'line_stats' => [
                'total_users' => $totalUsers,
                'line_friend_count' => $lineFriendCount,
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
