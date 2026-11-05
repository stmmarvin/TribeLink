<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ChatApiController extends Controller
{
    // Return all chats for the authenticated user as JSON
    public function index(): JsonResponse
    {
        $chats = Auth::user()->chats()->with([
            'users:id,name,email',
            'messages' => function ($query) {
                $query->latest()->limit(1);
            },
        ])->get();

        return response()->json([
            'data' => $chats,
        ], 200);
    }

    // Find existing chat or create a new one, then return JSON
    public function openOrCreate(User $user): JsonResponse
    {
        $authId = Auth::id();

        // check if chat between these users already exists
        $chat = Chat::whereHas('users', function ($query) use ($authId) {
            $query->where('user_id', $authId);
        })->whereHas('users', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })->first();

        // Create new chat if not found
        if (! $chat) {
            $chat = Chat::create();
            $chat->users()->attach([$authId, $user->id]);

        }

        $chat->load('users:id,name,email');

        return response()->json([
            'data' => $chat,
        ], 200);
    }

    // Save a new message and return it as JSON
    public function storeMessage(Request $request, Chat $chat): JsonResponse
    {
        // check if user is participant
        if (! $chat->users->contains(Auth::id())) {
            return response()->json([
                'message' => 'Unauthorized access.',
            ], 403);
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $message = $chat->messages()->create([
            'user_id' => Auth::id(),
            'body' => $validated['body'],
        ]);

        $message->load('user:id,name');

        return response()->json([
            'message' => 'Message sent successfully.',
            'data' => $message,
        ], 201);
    }

    // Return messages for a specific chat
    public function show(Chat $chat): JsonResponse
    {
        if (! $chat->users->contains(Auth::id())) {

            return response()->json([
                'message' => 'Unauthorized access.',
            ], 403);
        }

        $chat->load(['messages.user:id,name', 'users:id,name,email']);

        return response()->json([
            'data' => $chat,
        ], 200);
    }
}
