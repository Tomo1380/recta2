<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SendLineBroadcastRequest;
use App\Http\Requests\Admin\SendLinePushRequest;
use App\Http\Resources\LineFriendResource;
use App\Http\Resources\LineMessageResource;
use App\Models\LineFriend;
use App\Models\LineMessage;
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
     * @response array{success: bool}
     */
    public function push(SendLinePushRequest $request): JsonResponse
    {
        $lineUserId = $request->validated()['line_user_id'];
        $messageText = $request->validated()['message'];

        $messages = [['type' => 'text', 'text' => $messageText]];
        $result = $this->lineService->pushMessage($lineUserId, $messages);

        if (!$result['success']) {
            return response()->json([
                'error' => 'メッセージの送信に失敗しました',
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

        return response()->json(['success' => true]);
    }

    /**
     * Broadcast message to all friends.
     *
     * @response array{success: bool}
     */
    public function broadcast(SendLineBroadcastRequest $request): JsonResponse
    {
        $messageText = $request->validated()['message'];

        $messages = [['type' => 'text', 'text' => $messageText]];
        $result = $this->lineService->broadcastMessage($messages);

        if (!$result['success']) {
            return response()->json([
                'error' => 'ブロードキャストの送信に失敗しました',
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

        return response()->json(['success' => true]);
    }
}
