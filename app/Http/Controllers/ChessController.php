<?php

namespace App\Http\Controllers;

use App\Games\Matchmaking;
use App\Models\ChessGame;
use App\Models\LobbyPresence;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Chess at the boards in the Hotel. Clicking a board puts you in its queue
 * (`search`, App\Games\Matchmaking); the Hotel then polls `queue` every second. A second student at
 * the same board is matched with you; when nobody comes within
 * `chess.npc_wait_seconds` you play the NPC. The game page polls `show`,
 * which keeps your seat alive and makes an absent opponent lose on time.
 */
class ChessController extends Controller
{
    /** Rooms with chess boards (see LobbyPresence::ROOMS). */
    private const ROOMS = ['kantine'];

    private Matchmaking $queue;

    public function __construct()
    {
        $this->queue = new Matchmaking('chess');
    }

    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'room_id' => ['required', 'string', Rule::in(self::ROOMS)],
            'board_id' => ['required', 'string', 'max:40', 'regex:/^[a-z0-9-]+$/'],
            'difficulty' => ['nullable', Rule::in(config('chess.npc.difficulties'))],
        ]);

        $user = $request->user();

        // A new game at a board ends whatever you were still playing
        ChessGame::for($user)->active()->get()->each->forfeit($user, 'left');

        $this->queue->join($user, $validated['room_id'], $validated['board_id'], [
            'difficulty' => $validated['difficulty'] ?? config('chess.npc.default_difficulty'),
        ]);

        return response()->json($this->queueState($user));
    }

    /** Polled by the Hotel while you wait at a board. */
    public function queue(Request $request): JsonResponse
    {
        return response()->json($this->queueState($request->user()));
    }

    public function cancel(Request $request): JsonResponse
    {
        $this->queue->leave($request->user());

        return response()->json(['status' => 'idle']);
    }

    public function show(Request $request, ChessGame $chessGame): Response
    {
        abort_unless($chessGame->hasParticipant($request->user()), 403);

        return Inertia::render('ontmoeten/schaken', [
            'game' => fn () => $this->gameState($request->user(), $chessGame),
        ]);
    }

    public function move(Request $request, ChessGame $chessGame): RedirectResponse
    {
        $user = $request->user();
        abort_unless($chessGame->hasParticipant($user), 403);

        $validated = $request->validate([
            'from' => ['required', 'string', 'regex:/^[a-h][1-8]$/'],
            'to' => ['required', 'string', 'regex:/^[a-h][1-8]$/'],
            'promotion' => ['nullable', 'in:q,r,b,n'],
        ]);

        $error = DB::transaction(function () use ($user, $chessGame, $validated) {
            $game = ChessGame::lockForUpdate()->findOrFail($chessGame->id);

            return match (true) {
                ! $game->isActive() => 'Deze partij is al afgelopen.',
                $game->isCountingDown() => 'De partij is nog niet begonnen.',
                ! $game->mayMove($user) => 'Je bent niet aan zet.',
                ! $game->play($validated['from'], $validated['to'], $validated['promotion'] ?? null) => 'Die zet mag niet.',
                default => null,
            };
        });

        return $error ? back()->withErrors(['move' => $error]) : back();
    }

    public function resign(Request $request, ChessGame $chessGame): RedirectResponse
    {
        $user = $request->user();
        abort_unless($chessGame->hasParticipant($user), 403);

        $chessGame->forfeit($user, 'resign');

        return back();
    }

    /** "Verlaten": counts as resigning while the game is still running. */
    public function leave(Request $request, ChessGame $chessGame): RedirectResponse
    {
        $user = $request->user();
        abort_unless($chessGame->hasParticipant($user), 403);

        $chessGame->forfeit($user, 'left');

        return to_route('ontmoeten.lobby', ['kamer' => $chessGame->room_id]);
    }

    /**
     * Where the user stands at a board: `searching`, `matched` (with the
     * game to go to) or `idle`. Keeps the queue spot alive and matches.
     *
     * @return array<string, mixed>
     */
    private function queueState(User $user): array
    {
        $game = ChessGame::for($user)->active()->latest('id')->first();

        if ($game) {
            return $this->matched($game);
        }

        $queued = $this->queue->spot($user);

        if (! $queued) {
            return ['status' => 'idle'];
        }

        $game = $this->tryMatch($user);

        return $game ? $this->matched($game) : [
            'status' => 'searching',
            'npcInSeconds' => Matchmaking::secondsLeft($queued->created_at, (int) config('chess.npc_wait_seconds')),
        ];
    }

    /**
     * Pair the user with someone else waiting at the same board (colours at
     * random), or with the NPC once they waited long enough on their own.
     */
    private function tryMatch(User $user): ?ChessGame
    {
        return DB::transaction(function () use ($user) {
            $waiting = $this->queue->waitingAt(...$this->tableOf($user));
            $mine = $waiting->firstWhere('user_id', $user->id);

            if (! $mine) {
                return null;
            }

            $other = $waiting->firstWhere('user_id', '!=', $user->id);

            if ($other) {
                $players = collect([$user, $other->user])->shuffle();
                $game = ChessGame::start($mine->room_id, $mine->table_id, $players[0], $players[1]);
                $this->queue->remove([$mine, $other]);

                return $game;
            }

            if ($mine->created_at->gt(now()->subSeconds((int) config('chess.npc_wait_seconds')))) {
                return null;
            }

            $difficulty = $mine->option('difficulty');
            $game = random_int(0, 1) === 0
                ? ChessGame::start($mine->room_id, $mine->table_id, $user, null, $difficulty)
                : ChessGame::start($mine->room_id, $mine->table_id, null, $user, $difficulty);
            $this->queue->remove([$mine]);

            return $game;
        });
    }

    /** @return array{string, string} Room and board the user waits at. */
    private function tableOf(User $user): array
    {
        $spot = $this->queue->spot($user);

        return [$spot?->room_id ?? '', $spot?->table_id ?? ''];
    }

    /** @return array<string, mixed> */
    private function matched(ChessGame $game): array
    {
        return [
            'status' => 'matched',
            'gameId' => $game->id,
            'startsAt' => $game->starts_at->toIso8601String(),
            'serverNow' => now()->toIso8601String(),
        ];
    }

    /**
     * The game for this user, in the shape of `ChessGameState`
     * (resources/js/types/chess.ts). Marks the user as present and lets an
     * absent real opponent lose on time.
     *
     * @return array<string, mixed>
     */
    private function gameState(User $user, ChessGame $game): array
    {
        $color = $game->colorOf($user);
        $opponent = ChessGame::opposite($color);

        if ($game->isActive()) {
            $opponentSeen = $game->{$opponent.'_seen_at'};

            if (! $game->isNpc($opponent)
                && ! $game->isCountingDown()
                && $this->queue->isDisconnected($opponentSeen)) {
                $game->finish('timeout', $color);
            } else {
                $game->update([$color.'_seen_at' => now()]);
            }
        }

        $game->loadMissing(['white', 'black']);
        $looks = LobbyPresence::whereIn('user_id', array_filter([$game->white_id, $game->black_id]))
            ->pluck('look', 'user_id');

        $player = fn (string $side): array => $game->isNpc($side)
            ? ['id' => null, 'username' => config('chess.npc.name'), 'isNpc' => true, 'look' => null]
            : [
                'id' => $game->{$side.'_id'},
                'username' => $game->{$side}->username,
                'isNpc' => false,
                'look' => $looks[$game->{$side.'_id'}] ?? null,
            ];

        return [
            'id' => $game->id,
            'roomId' => $game->room_id,
            'boardId' => $game->board_id,
            'status' => $game->isCountingDown() ? 'countdown' : $game->status,
            'startsAt' => $game->starts_at->toIso8601String(),
            'serverNow' => now()->toIso8601String(),
            'myColor' => $color,
            'white' => $player(ChessGame::WHITE),
            'black' => $player(ChessGame::BLACK),
            'npcDifficulty' => $game->npc_difficulty,
            'fen' => $game->fen,
            'moves' => $game->moves,
            'pgn' => $game->pgn,
            'result' => $game->result,
            'winner' => $game->winner,
            'endReason' => $game->end_reason,
        ];
    }
}
