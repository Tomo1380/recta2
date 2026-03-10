<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('line_display_name', 'ilike', "%{$search}%")
                  ->orWhere('nickname', 'ilike', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $users = $query->withCount(['reviews' => fn ($q) => $q->where('status', 'published')])
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 20));

        return response()->json($users);
    }

    public function show(User $user): JsonResponse
    {
        $user->load(['reviews' => fn ($q) => $q->with('store:id,name')->latest()->limit(20)])
            ->loadCount('reviews');

        return response()->json($user);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:active,suspended',
        ]);

        $user->update(['status' => $request->status]);

        return response()->json($user);
    }
}
