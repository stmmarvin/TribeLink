<?php

namespace App\Http\Controllers;

use App\Models\ArcadeScore;
use App\Models\CardGame;
use App\Models\ChessGame;
use App\Models\LobbyMessage;
use App\Models\LobbyPresence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LobbyController extends Controller
{
    /** Someone who hasn't synced for this long has left the room. */
    private const SYNC_TIMEOUT_SECONDS = 8;

    /** Validation rules for an avatar outfit, under the given key. */
    private static function lookRules(string $key = 'look'): array
    {
        return [
            $key => ['required', 'array'],
            "{$key}.skin" => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            "{$key}.hair" => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            "{$key}.hairStyle" => ['required', 'integer', 'in:0,1,2'],
            "{$key}.shirt" => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            "{$key}.pants" => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            "{$key}.shoes" => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ];
    }

    /** @param array<string, mixed> $look */
    private static function cleanLook(array $look): array
    {
        // Fixed key order, so comparing with the stored outfit works
        return [
            'skin' => $look['skin'],
            'hair' => $look['hair'],
            'hairStyle' => (int) $look['hairStyle'],
            'shirt' => $look['shirt'],
            'pants' => $look['pants'],
            'shoes' => $look['shoes'],
        ];
    }

    /** "Maak je poppetje": the avatar maker you see right after registering. */
    public function avatar(Request $request): Response
    {
        return Inertia::render('ontmoeten/poppetje', [
            'look' => $request->user()->hotel_look,
        ]);
    }

    public function storeAvatar(Request $request): RedirectResponse
    {
        $validated = $request->validate(self::lookRules());

        $request->user()->forceFill(['hotel_look' => self::cleanLook($validated['look'])])->save();

        return redirect()->route('ontmoeten.lobby');
    }

    public function show(Request $request): Response
    {
        $roomId = $this->roomId((string) $request->query('kamer', 'kantine'));
        $this->touch($request, $roomId);

        // Friends you can invite to a game in the Hotel
        $friends = $request->user()->friends()
            ->select('users.id', 'users.username')
            ->orderBy('username')
            ->get()
            ->map(fn ($friend): array => [
                'id' => (string) $friend->id,
                'username' => $friend->username,
            ])
            ->values()
            ->all();

        return Inertia::render('ontmoeten/lobby', [
            'lobbyRooms' => LobbyPresence::roomSummaries(),
            'currentRoomId' => $roomId,
            'savedLook' => $request->user()->hotel_look,
            'gameProposals' => $this->proposals($roomId),
            'friends' => $friends,
            // A chess game you're still in (e.g. after a refresh): the Hotel offers to go back
            'activeChessGame' => ChessGame::for($request->user())->active()->latest('id')->value('id'),
            // The same for a game of Tribekaarten
            'activeCardGame' => CardGame::playedBy($request->user())->active()->latest('id')->value('id'),
            // Scoreboard on the wall of the Arcade: today's top 3 per game (it switches between them)
            'arcadeScoreboards' => $roomId === 'arcade' ? collect(config('arcade.games'))->map(
                fn (array $game, string $id) => ['name' => $game['name'], 'scores' => ArcadeScore::leaderboard($id, now()->startOfDay(), 3)],
            )->all() : null,
        ]);
    }

    public function heartbeat(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'room_id' => ['required', 'string', 'in:'.implode(',', array_keys(LobbyPresence::ROOMS))],
        ]);

        $presence = $this->touch($request, $validated['room_id']);

        if (! $request->expectsJson()) {
            return back();
        }

        return response()->json([
            'room_id' => $presence->room_id,
            'people_count' => $this->peopleCount($presence->room_id),
        ]);
    }

    public function proposeGame(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'room_id' => ['required', 'string', 'in:'.implode(',', array_keys(LobbyPresence::ROOMS))],
            'game_proposal' => ['required', 'string', 'min:2', 'max:120'],
        ]);

        $this->touch($request, $validated['room_id'])->update([
            'game_proposal' => trim($validated['game_proposal']),
        ]);

        return back()->with('success', 'Je spelvoorstel staat in de lobby.');
    }

    /**
     * Multiplayer sync, called about every second by the Hotel page: stores
     * where your avatar is and what it does, and returns the other people in
     * the same room plus the chat lines said since `since`.
     */
    public function sync(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'room_id' => ['required', 'string', 'in:'.implode(',', array_keys(LobbyPresence::ROOMS))],
            'x' => ['required', 'integer', 'min:0', 'max:64'],
            'y' => ['required', 'integer', 'min:0', 'max:64'],
            'dir' => ['required', 'integer', 'min:0', 'max:7'],
            'sitting' => ['required', 'boolean'],
            'dancing' => ['required', 'boolean'],
            'typing' => ['required', 'boolean'],
            'waves' => ['required', 'integer', 'min:0'],
            ...self::lookRules(),
            'since' => ['nullable', 'integer', 'min:0'],
        ]);

        $roomId = $validated['room_id'];
        $look = self::cleanLook($validated['look']);
        // Your outfit also lives on your account, so it's the same on every device
        if ($request->user()->hotel_look !== $look) {
            $request->user()->forceFill(['hotel_look' => $look])->save();
        }
        $this->touch($request, $roomId)->update([
            ...collect($validated)->only(['x', 'y', 'dir', 'sitting', 'dancing', 'typing', 'waves'])->all(),
            'look' => $look,
        ]);

        $people = LobbyPresence::query()
            ->with('user:id,username')
            ->where('room_id', $roomId)
            ->where('user_id', '!=', $request->user()->id)
            ->whereNotNull('x')
            ->where('last_seen_at', '>=', now()->subSeconds(self::SYNC_TIMEOUT_SECONDS))
            ->get()
            ->map(fn (LobbyPresence $presence): array => [
                'id' => $presence->user_id,
                'username' => $presence->user->username,
                'x' => $presence->x,
                'y' => $presence->y,
                'dir' => $presence->dir,
                'look' => $presence->look,
                'sitting' => $presence->sitting,
                'dancing' => $presence->dancing,
                'typing' => $presence->typing,
                'waves' => $presence->waves,
            ])
            ->values()
            ->all();

        $since = $validated['since'] ?? null;
        $messages = $since === null ? collect() : LobbyMessage::query()
            ->with('user:id,username')
            ->where('room_id', $roomId)
            ->where('id', '>', $since)
            ->oldest('id')
            ->limit(50)
            ->get();

        return response()->json([
            'people' => $people,
            'messages' => $messages->map(fn (LobbyMessage $message): array => [
                'id' => $message->id,
                'userId' => $message->user_id,
                'username' => $message->user->username,
                'body' => $message->body,
            ])->values()->all(),
            // First sync (no `since`): start after the newest line, no history replay
            'latestMessageId' => $messages->last()?->id
                ?? ($since ?? (int) LobbyMessage::where('room_id', $roomId)->max('id')),
            'peopleCount' => count($people) + 1,
        ]);
    }

    /** Say something in the room; others receive it with their next sync. */
    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'room_id' => ['required', 'string', 'in:'.implode(',', array_keys(LobbyPresence::ROOMS))],
            'body' => ['required', 'string', 'max:100', 'regex:/\S/'],
        ]);

        $message = LobbyMessage::create([
            'user_id' => $request->user()->id,
            'room_id' => $validated['room_id'],
            'body' => trim($validated['body']),
        ]);

        return response()->json(['id' => $message->id], 201);
    }

    private function touch(Request $request, string $roomId): LobbyPresence
    {
        return LobbyPresence::updateOrCreate(
            ['user_id' => $request->user()->id],
            ['room_id' => $this->roomId($roomId), 'last_seen_at' => now()],
        );
    }

    private function proposals(string $roomId): array
    {
        return LobbyPresence::query()
            ->with('user:id,username')
            ->where('room_id', $roomId)
            ->whereNotNull('game_proposal')
            ->active()
            ->latest('last_seen_at')
            ->get()
            ->map(fn (LobbyPresence $presence): array => [
                'username' => $presence->user->username,
                'game' => $presence->game_proposal,
            ])
            ->values()
            ->all();
    }

    private function peopleCount(string $roomId): int
    {
        return LobbyPresence::active()->where('room_id', $roomId)->count();
    }

    private function roomId(string $roomId): string
    {
        abort_unless(array_key_exists($roomId, LobbyPresence::ROOMS), 404);

        return $roomId;
    }
}
