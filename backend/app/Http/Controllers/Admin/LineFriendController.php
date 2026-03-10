<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LineFriend;
use App\Models\LineMessage;
use App\Services\LineMessagingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LineFriendController extends Controller
{
    public function __construct(
        private LineMessagingService $lineService
    ) {}

    /**
     * Paginated friends list with user info.
     */
    public function index(Request $request): JsonResponse
    {
        $query = LineFriend::with('user')
            ->withCount('messages');

        // Search by display_name
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('display_name', 'ilike', "%{$search}%")
                  ->orWhere('line_user_id', 'ilike', "%{$search}%");
            });
        }

        // Filter by is_following
        if ($request->has('is_following')) {
            $query->where('is_following', $request->boolean('is_following'));
        }

        $friends = $query->orderByDesc('updated_at')
            ->paginate($request->input('per_page', 20));

        return response()->json($friends);
    }

    /**
     * Paginated message history for a specific LINE user.
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
            'friend' => $friend,
            'messages' => $messages,
        ]);
    }

    /**
     * Send a push message to a specific user.
     */
    public function push(Request $request): JsonResponse
    {
        $request->validate([
            'line_user_id' => 'required|string',
            'message' => 'required|string|max:5000',
        ]);

        $lineUserId = $request->input('line_user_id');
        $messageText = $request->input('message');

        $messages = [
            ['type' => 'text', 'text' => $messageText],
        ];

        $result = $this->lineService->pushMessage($lineUserId, $messages);

        if (!$result['success']) {
            return response()->json([
                'error' => 'メッセージの送信に失敗しました',
                'details' => $result['body'],
            ], 422);
        }

        // Find friend to get user_id
        $friend = LineFriend::where('line_user_id', $lineUserId)->first();

        // Store outbound message
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
     */
    public function broadcast(Request $request): JsonResponse
    {
        $request->validate([
            'message' => 'required|string|max:5000',
        ]);

        $messageText = $request->input('message');

        $messages = [
            ['type' => 'text', 'text' => $messageText],
        ];

        $result = $this->lineService->broadcastMessage($messages);

        if (!$result['success']) {
            return response()->json([
                'error' => 'ブロードキャストの送信に失敗しました',
                'details' => $result['body'],
            ], 422);
        }

        // Store as broadcast message (line_user_id = 'broadcast')
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
