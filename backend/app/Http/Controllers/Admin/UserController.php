<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LineFriend;
use App\Models\LineMessage;
use App\Models\User;
use App\Services\LineMessagingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
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

        // LINE friend status filter
        $lineStatus = $request->input('line_status');
        if ($lineStatus === 'friend') {
            $query->whereHas('lineFriend', fn ($q) => $q->where('is_following', true));
        } elseif ($lineStatus === 'not_friend') {
            $query->where(function ($q) {
                $q->whereDoesntHave('lineFriend')
                  ->orWhereHas('lineFriend', fn ($sub) => $sub->where('is_following', false));
            });
        }

        $users = $query->withCount(['reviews' => fn ($q) => $q->where('status', 'published')])
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 20));

        // LINE friend stats
        $totalUsers = User::count();
        $lineFriendCount = User::whereHas('lineFriend', fn ($q) => $q->where('is_following', true))->count();

        return response()->json([
            'users' => $users,
            'line_stats' => [
                'total_users' => $totalUsers,
                'line_friend_count' => $lineFriendCount,
            ],
        ]);
    }

    public function show(User $user): JsonResponse
    {
        $user->load([
            'reviews' => fn ($q) => $q->with('store:id,name')->latest()->limit(20),
            'lineFriend',
        ])->loadCount('reviews');

        // Include recent LINE messages if lineFriend exists
        $lineMessages = [];
        if ($user->lineFriend) {
            $lineMessages = LineMessage::where('line_user_id', $user->line_user_id)
                ->orderByDesc('created_at')
                ->limit(5)
                ->get();
        }

        return response()->json([
            'user' => $user,
            'line_messages' => $lineMessages,
        ]);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:active,suspended',
        ]);

        $user->update(['status' => $request->status]);

        return response()->json($user);
    }

    public function updateNotes(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'admin_notes' => 'nullable|string|max:5000',
        ]);

        $user->update(['admin_notes' => $request->admin_notes]);

        return response()->json($user);
    }

    /**
     * Send a LINE push message to a user via their line_user_id.
     */
    public function sendLineMessage(Request $request, User $user, LineMessagingService $lineService): JsonResponse
    {
        $request->validate([
            'message' => 'required|string|max:5000',
        ]);

        if (!$user->line_user_id) {
            return response()->json([
                'error' => 'このユーザーにはLINE IDが紐付けられていません',
            ], 422);
        }

        // Check if user is a LINE friend
        $friend = $user->lineFriend;
        if (!$friend || !$friend->is_following) {
            return response()->json([
                'error' => 'このユーザーはLINE友だちではないためメッセージを送信できません',
            ], 422);
        }

        $messageText = $request->input('message');
        $messages = [
            ['type' => 'text', 'text' => $messageText],
        ];

        $result = $lineService->pushMessage($user->line_user_id, $messages);

        if (!$result['success']) {
            return response()->json([
                'error' => 'メッセージの送信に失敗しました',
                'details' => $result['body'],
            ], 422);
        }

        // Store outbound message
        LineMessage::create([
            'line_user_id' => $user->line_user_id,
            'user_id' => $user->id,
            'direction' => 'outbound',
            'message_type' => 'text',
            'content' => $messageText,
        ]);

        return response()->json(['success' => true]);
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
                'is_following' => $friend->is_following,
                'followed_at' => $friend->followed_at,
                'user' => $user,
            ] : null,
            'messages' => $messages,
        ]);
    }
}
