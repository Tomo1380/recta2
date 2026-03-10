<?php

namespace App\Http\Controllers;

use App\Models\LineFriend;
use App\Models\LineMessage;
use App\Models\User;
use App\Services\LineMessagingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LineWebhookController extends Controller
{
    public function __construct(
        private LineMessagingService $lineService
    ) {}

    /**
     * Handle LINE webhook events.
     */
    public function handle(Request $request): JsonResponse
    {
        // Verify signature
        $signature = $request->header('X-Line-Signature', '');
        $body = $request->getContent();

        if (!$this->lineService->verifySignature($body, $signature)) {
            Log::warning('LINE webhook: invalid signature');
            return response()->json(['error' => 'Invalid signature'], 403);
        }

        $events = $request->input('events', []);

        foreach ($events as $event) {
            match ($event['type'] ?? null) {
                'follow' => $this->handleFollow($event),
                'unfollow' => $this->handleUnfollow($event),
                'message' => $this->handleMessage($event),
                default => Log::info('LINE webhook: unhandled event type', ['type' => $event['type'] ?? 'unknown']),
            };
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * Handle follow event - user added the bot as friend.
     */
    private function handleFollow(array $event): void
    {
        $lineUserId = $event['source']['userId'] ?? null;
        if (!$lineUserId) return;

        $friend = LineFriend::updateOrCreate(
            ['line_user_id' => $lineUserId],
            [
                'is_following' => true,
                'followed_at' => now(),
                'unfollowed_at' => null,
            ]
        );

        // Try to link to existing user
        $this->linkUserToFriend($friend);

        Log::info('LINE webhook: follow', ['line_user_id' => $lineUserId]);
    }

    /**
     * Handle unfollow event - user blocked/removed the bot.
     */
    private function handleUnfollow(array $event): void
    {
        $lineUserId = $event['source']['userId'] ?? null;
        if (!$lineUserId) return;

        LineFriend::where('line_user_id', $lineUserId)->update([
            'is_following' => false,
            'unfollowed_at' => now(),
        ]);

        Log::info('LINE webhook: unfollow', ['line_user_id' => $lineUserId]);
    }

    /**
     * Handle message event - user sent a message.
     */
    private function handleMessage(array $event): void
    {
        $lineUserId = $event['source']['userId'] ?? null;
        if (!$lineUserId) return;

        $message = $event['message'] ?? [];
        $messageType = $message['type'] ?? 'text';
        $content = match ($messageType) {
            'text' => $message['text'] ?? '',
            'image' => '[画像]',
            'video' => '[動画]',
            'audio' => '[音声]',
            'sticker' => '[スタンプ]',
            'location' => '[位置情報]',
            default => "[{$messageType}]",
        };

        // Ensure friend record exists
        $friend = LineFriend::firstOrCreate(
            ['line_user_id' => $lineUserId],
            [
                'is_following' => true,
                'followed_at' => now(),
            ]
        );

        // Try to link user
        $this->linkUserToFriend($friend);

        // Store message
        LineMessage::create([
            'line_user_id' => $lineUserId,
            'user_id' => $friend->user_id,
            'direction' => 'inbound',
            'message_type' => $messageType,
            'content' => $content,
            'line_message_id' => $message['id'] ?? null,
        ]);

        Log::info('LINE webhook: message', [
            'line_user_id' => $lineUserId,
            'type' => $messageType,
        ]);
    }

    /**
     * Try to link a LineFriend to a User by matching line_user_id.
     */
    private function linkUserToFriend(LineFriend $friend): void
    {
        if ($friend->user_id) return;

        $user = User::where('line_user_id', $friend->line_user_id)->first();
        if ($user) {
            $friend->update([
                'user_id' => $user->id,
                'display_name' => $friend->display_name ?: $user->line_display_name,
                'picture_url' => $friend->picture_url ?: $user->line_picture_url,
            ]);
        }
    }
}
