<?php

namespace App\Http\Controllers;

use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Models\Chat;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ChatController extends Controller
{
    // Ontmoeten overview: only needs the conversations (for the unread badge)
    public function ontmoeten(): Response
    {
        return Inertia::render('ontmoeten/index', [
            'conversations' => $this->conversationsFor(Auth::user()),
        ]);
    }

    public function index(): Response
    {
        $conversations = $this->conversationsFor(Auth::user());

        return Inertia::render('ontmoeten/berichten', [
            'conversationId' => null,
            'conversations' => $conversations,
            'contacts' => $this->contactsFrom($conversations),
            'messages' => [],
        ]);
    }

    // Open existing chat or create a new one with a specific user
    public function openOrCreate(User $user): RedirectResponse
    {
        $authId = Auth::id();

        // A chat with yourself would match any of your own chats below
        abort_if($user->id === $authId, 404);

        // Check if a direct chat between these two users already exists
        $chat = Chat::query()
            ->whereHas('users', fn ($query) => $query->whereKey($authId))
            ->whereHas('users', fn ($query) => $query->whereKey($user->id))
            ->has('users', '=', 2)
            ->first();

        if (! $chat) {
            $chat = Chat::create();
            $chat->users()->attach([$authId, $user->id]);
        }

        return redirect()->route('chats.show', $chat);
    }

    // Display messages of a single chat
    public function show(Chat $chat): Response
    {
        // Check access authorization
        abort_unless($chat->users->contains(Auth::id()), 403);

        // Opening the chat (or polling it while open) reads the other person's messages
        $chat->messages()
            ->where('user_id', '!=', Auth::id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $chat->load(['messages' => fn ($query) => $query->oldest()->oldest('id')]);

        $conversations = $this->conversationsFor(Auth::user());

        return Inertia::render('ontmoeten/berichten', [
            'conversationId' => (string) $chat->id,
            'conversations' => $conversations,
            'contacts' => $this->contactsFrom($conversations),
            'messages' => MessageResource::collection($chat->messages)->resolve(),
        ]);
    }

    // Store a new message in the chat
    public function storeMessage(Request $request, Chat $chat): RedirectResponse
    {
        abort_unless($chat->users->contains(Auth::id()), 403);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000', 'regex:/\S/'],
        ]);

        $chat->messages()->create([
            'user_id' => Auth::id(),
            'body' => trim($validated['body']),
        ]);

        return back();
    }

    /**
     * The user's chats as `Conversation[]`, most recent activity first.
     *
     * @return array<int, array<string, mixed>>
     */
    private function conversationsFor(User $user): array
    {
        $chats = $user->chats()
            ->with([
                'users',
                'messages' => function ($query) {
                    $query->latest()->latest('id')->limit(1);
                },
            ])
            ->withCount(['messages as unread_count' => function ($query) use ($user) {
                $query->whereNull('read_at')->where('user_id', '!=', $user->id);
            }])
            ->get()
            ->sortByDesc(fn (Chat $chat) => $chat->messages->first()->created_at ?? $chat->created_at)
            ->values();

        return ConversationResource::collection($chats)->resolve();
    }

    /**
     * There is no contacts system yet: everyone you have a chat with counts as
     * a (saved) contact.
     *
     * @param  array<int, array<string, mixed>>  $conversations
     * @return array<int, array<string, mixed>>
     */
    private function contactsFrom(array $conversations): array
    {
        return array_map(fn (array $conversation) => [
            ...$conversation['contact'],
            'status' => $conversation['status'],
            'subtitle' => null,
        ], $conversations);
    }
}
