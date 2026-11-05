<?php

namespace App\Http\Controllers;

use App\Models\Chat;
use App\Models\RandomChat;
use App\Models\RandomChatQueue;
use App\Models\RandomChatReport;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Random chat matchmaking. Students who press "Start" wait in a queue; two
 * students who are searching at the same time are matched into an anonymous
 * RandomChat. The page polls `show` (every few seconds), which keeps the
 * user's queue spot / chat presence alive and makes the match.
 */
class RandomChatController extends Controller
{
    /** A queued user who hasn't polled for this long is not matched. */
    private const QUEUE_TIMEOUT_SECONDS = 15;

    /** A chat partner who hasn't polled for this long has left. */
    private const PARTNER_TIMEOUT_SECONDS = 30;

    /** How long the "chat beëindigd" screen keeps showing after an end. */
    private const ENDED_VISIBLE_MINUTES = 10;

    public function show(Request $request): Response
    {
        return Inertia::render('ontmoeten/random-chat', [
            'randomChat' => fn () => $this->session($request->user()),
        ]);
    }

    public function search(Request $request): RedirectResponse
    {
        $this->enqueue($request->user());

        return back();
    }

    public function cancel(Request $request): RedirectResponse
    {
        RandomChatQueue::where('user_id', $request->user()->id)->delete();

        return back();
    }

    public function storeMessage(Request $request, RandomChat $randomChat): RedirectResponse
    {
        $user = $request->user();
        abort_unless($randomChat->hasParticipant($user), 403);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000', 'regex:/\S/'],
        ]);

        if ($randomChat->ended_at !== null) {
            return back()->withErrors(['body' => 'Deze chat is beëindigd.']);
        }

        $randomChat->messages()->create([
            'user_id' => $user->id,
            'body' => trim($validated['body']),
        ]);

        return back();
    }

    /** "Bewaren": the partner becomes a contact (a regular chat in Berichten). */
    public function save(Request $request, RandomChat $randomChat): RedirectResponse
    {
        $user = $request->user();
        abort_unless($randomChat->hasParticipant($user), 403);

        $randomChat->update([$randomChat->sideOf($user).'_saved' => true]);
        $this->contactChatBetween($user, $randomChat->partnerOf($user));

        return back();
    }

    /** "Chat verlaten" (to Ontmoeten) or "Volgende" (`search: true`). */
    public function leave(Request $request, RandomChat $randomChat): RedirectResponse
    {
        $user = $request->user();
        abort_unless($randomChat->hasParticipant($user), 403);

        $randomChat->end($user, 'left');

        if ($request->boolean('search')) {
            $this->enqueue($user);

            return back();
        }

        return to_route('ontmoeten');
    }

    public function report(Request $request, RandomChat $randomChat): RedirectResponse
    {
        $user = $request->user();
        abort_unless($randomChat->hasParticipant($user), 403);

        $validated = $request->validate([
            'reason' => ['required', Rule::in(['spam', 'inappropriate', 'harassment', 'other'])],
            'details' => ['nullable', 'string', 'max:500'],
        ]);

        RandomChatReport::create([
            'random_chat_id' => $randomChat->id,
            'reporter_id' => $user->id,
            'reported_id' => $randomChat->partnerOf($user)->id,
            'reason' => $validated['reason'],
            'details' => $validated['details'] ?? null,
        ]);
        $randomChat->end($user, 'reported');

        return back();
    }

    private function enqueue(User $user): void
    {
        RandomChat::for($user)->active()->get()->each->end($user, 'left');

        RandomChatQueue::updateOrCreate(['user_id' => $user->id], ['last_seen_at' => now()]);
        $this->tryMatch($user);
    }

    /**
     * Pair the user with the longest-waiting other searcher, if any.
     * Students who reported each other are never matched again.
     */
    private function tryMatch(User $user): ?RandomChat
    {
        return DB::transaction(function () use ($user) {
            $mine = RandomChatQueue::where('user_id', $user->id)->lockForUpdate()->first();

            if (! $mine) {
                return null;
            }

            $blocked = RandomChatReport::query()
                ->where('reporter_id', $user->id)->pluck('reported_id')
                ->merge(RandomChatReport::where('reported_id', $user->id)->pluck('reporter_id'));

            $other = RandomChatQueue::query()
                ->where('user_id', '!=', $user->id)
                ->whereNotIn('user_id', $blocked)
                ->where('last_seen_at', '>=', now()->subSeconds(self::QUEUE_TIMEOUT_SECONDS))
                ->oldest()
                ->lockForUpdate()
                ->first();

            if (! $other) {
                return null;
            }

            $chat = RandomChat::create([
                'user_one_id' => $other->user_id,
                'user_two_id' => $user->id,
                'user_one_seen_at' => now(),
                'user_two_seen_at' => now(),
            ]);

            RandomChatQueue::whereIn('user_id', [$user->id, $other->user_id])->delete();

            return $chat;
        });
    }

    /**
     * The Random chat state for this user, in the shape of
     * `RandomChatSession` (resources/js/types/random-chat.ts).
     *
     * @return array<string, mixed>
     */
    private function session(User $user): array
    {
        $chat = RandomChat::for($user)->active()->with(['userOne', 'userTwo'])->latest('id')->first();

        if ($chat) {
            $chat->update([$chat->sideOf($user).'_seen_at' => now()]);
            $partnerSeen = $chat->{($chat->sideOf($user) === 'user_one' ? 'user_two' : 'user_one').'_seen_at'};

            if ($partnerSeen === null || $partnerSeen->lt(now()->subSeconds(self::PARTNER_TIMEOUT_SECONDS))) {
                $chat->end($chat->partnerOf($user), 'timeout');
            } else {
                return $this->payload('chatting', $user, $chat);
            }
        }

        $queued = RandomChatQueue::where('user_id', $user->id)->first();

        if ($queued) {
            // A queue spot from an earlier visit that wasn't kept alive is dropped
            if ($queued->last_seen_at->lt(now()->subSeconds(self::QUEUE_TIMEOUT_SECONDS))) {
                $queued->delete();
            } else {
                $queued->update(['last_seen_at' => now()]);
                $match = $this->tryMatch($user);

                return $match
                    ? $this->payload('chatting', $user, $match->load(['userOne', 'userTwo']))
                    : $this->payload('searching', $user);
            }
        }

        // Show "chat beëindigd" after the partner left, or after you reported them
        $ended = RandomChat::for($user)
            ->whereNotNull('ended_at')
            ->where('ended_at', '>=', now()->subMinutes(self::ENDED_VISIBLE_MINUTES))
            ->where(fn ($q) => $q
                ->where('ended_by', '!=', $user->id)
                ->orWhere('end_reason', 'reported'))
            ->with(['userOne', 'userTwo'])
            ->latest('id')
            ->first();

        return $ended ? $this->payload('ended', $user, $ended) : $this->payload('idle', $user);
    }

    /** @return array<string, mixed> */
    private function payload(string $status, User $user, ?RandomChat $chat = null): array
    {
        $partner = $chat?->partnerOf($user);
        $endReason = match (true) {
            $chat === null || $chat->ended_at === null => null,
            $chat->ended_by === $user->id && $chat->end_reason === 'reported' => 'reported',
            default => 'partner-left',
        };

        return [
            'status' => $status,
            'onlineCount' => $this->onlineCount(),
            'chat' => $chat ? [
                'id' => (string) $chat->id,
                'partner' => ['id' => (string) $partner->id, 'username' => $partner->username],
                'saved' => (bool) $chat->{$chat->sideOf($user).'_saved'},
                'endReason' => $endReason,
            ] : null,
            'messages' => $status === 'chatting'
                ? $chat->messages()->oldest()->oldest('id')->get()->map(fn ($message) => [
                    'id' => (string) $message->id,
                    'conversationId' => 'random-'.$chat->id,
                    'senderId' => $message->user_id === $user->id ? 'me' : (string) $message->user_id,
                    'body' => $message->body,
                    'sentAt' => $message->created_at->toIso8601String(),
                ])->all()
                : [],
        ];
    }

    /** Students searching or chatting right now. */
    private function onlineCount(): int
    {
        $since = now()->subSeconds(self::PARTNER_TIMEOUT_SECONDS);

        $searching = RandomChatQueue::where('last_seen_at', '>=', $since)->pluck('user_id');
        $chatting = RandomChat::active()
            ->where(fn ($q) => $q->where('user_one_seen_at', '>=', $since)->orWhere('user_two_seen_at', '>=', $since))
            ->get(['user_one_id', 'user_two_id'])
            ->flatMap(fn (RandomChat $chat) => [$chat->user_one_id, $chat->user_two_id]);

        return $searching->merge($chatting)->unique()->count();
    }

    /** The regular (Berichten) chat between two users, created if missing. */
    private function contactChatBetween(User $user, User $partner): Chat
    {
        $chat = Chat::whereHas('users', fn ($q) => $q->where('user_id', $user->id))
            ->whereHas('users', fn ($q) => $q->where('user_id', $partner->id))
            ->first();

        if (! $chat) {
            $chat = Chat::create();
            $chat->users()->attach([$user->id, $partner->id]);
        }

        return $chat;
    }
}
