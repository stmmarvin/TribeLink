<?php

namespace App\Http\Controllers;

use App\Games\Cards\Card;
use App\Games\Cards\CardRules;
use App\Games\Matchmaking;
use App\Models\CardGame;
use App\Models\CardGamePlayer;
use App\Models\GameQueue;
use App\Models\LobbyPresence;
use App\Models\User;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Tribekaarten at the card table in the Hotel. Clicking the table puts you
 * in its queue (`search`, App\Games\Matchmaking); the Hotel polls `queue`
 * every second. Up to four students play together: the game starts
 * `cards.start_after_seconds` after the last one sat down (empty seats up to
 * two players become NPCs), straight away with "Nu starten met NPC's", or
 * when the table is full. "Wachten op spelers" stops the timer.
 *
 * The game page polls `show`, which keeps your seat alive and runs the
 * table (CardGame::advance). All rules are checked here: the browser only
 * sees its own hand and how many cards the others hold.
 */
class CardGameController extends Controller
{
    /** Rooms with a card table (see LobbyPresence::ROOMS). */
    private const ROOMS = ['kantine'];

    private Matchmaking $queue;

    public function __construct()
    {
        $this->queue = new Matchmaking('cards');
    }

    /** Before joining: who waits at the table, and how often you won. */
    public function table(Request $request): JsonResponse
    {
        $validated = $request->validate($this->tableRules());

        return response()->json([
            'waiting' => $this->queue->waitingAt($validated['room_id'], $validated['table_id'])
                ->map(fn (GameQueue $spot) => $spot->user->username)->values(),
            'wins' => CardGame::winsOf($request->user()),
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            ...$this->tableRules(),
            'difficulty' => ['nullable', Rule::in(config('cards.npc.difficulties'))],
            'house_rules' => ['nullable', 'array'],
            'house_rules.*' => ['string', Rule::in(array_keys(config('cards.house_rules')))],
        ]);

        $user = $request->user();

        // A new game at the table ends whatever you were still playing
        CardGame::playedBy($user)->active()->get()->each(
            fn (CardGame $game) => $game->forfeit($game->seatOf($user), CardGamePlayer::LEFT),
        );

        $this->queue->join($user, $validated['room_id'], $validated['table_id'], [
            'difficulty' => $validated['difficulty'] ?? config('cards.npc.default_difficulty'),
            'house_rules' => array_values(array_unique($validated['house_rules'] ?? [])),
            'start_now' => false,
            'wait' => false,
            'since' => now()->getTimestamp(),
        ]);

        return response()->json($this->queueState($user));
    }

    /** Polled by the Hotel while you wait at the table. */
    public function queue(Request $request): JsonResponse
    {
        return response()->json($this->queueState($request->user()));
    }

    /** "Nu starten met NPC's" */
    public function startNow(Request $request): JsonResponse
    {
        $this->updateSpot($request->user(), ['start_now' => true]);

        return response()->json($this->queueState($request->user()));
    }

    /** "Wachten op spelers" (on) or back to starting automatically (off). */
    public function wait(Request $request): JsonResponse
    {
        $validated = $request->validate(['wait' => ['required', 'boolean']]);
        $this->updateSpot($request->user(), ['wait' => $validated['wait'], 'since' => now()->getTimestamp()]);

        return response()->json($this->queueState($request->user()));
    }

    public function cancel(Request $request): JsonResponse
    {
        $this->queue->leave($request->user());

        return response()->json(['status' => 'idle']);
    }

    public function show(Request $request, CardGame $cardGame): Response
    {
        $user = $request->user();
        abort_unless($cardGame->seatOf($user), 403);

        return Inertia::render('ontmoeten/tribekaarten', [
            'game' => fn () => $this->locked($cardGame, function (CardGame $game) use ($user) {
                $me = $game->seatOf($user);

                if ($game->isActive() && $me->status === CardGamePlayer::PLAYING) {
                    $me->update(['seen_at' => now()]);
                }

                $game->advance();

                return $this->gameState($user, $game);
            }),
        ]);
    }

    public function play(Request $request, CardGame $cardGame): RedirectResponse
    {
        $validated = $request->validate([
            'card' => ['required', 'string', Rule::in(array_unique(Card::deck()))],
            'color' => ['nullable', Rule::in(Card::COLORS)],
            'target' => ['nullable', 'integer', 'between:0,3'],
        ]);

        return $this->move($request, $cardGame, fn (CardRules $rules, int $seat) => $rules->play(
            $seat,
            $validated['card'],
            $validated['color'] ?? null,
            $validated['target'] ?? null,
        ));
    }

    public function draw(Request $request, CardGame $cardGame): RedirectResponse
    {
        return $this->move($request, $cardGame, fn (CardRules $rules, int $seat) => $rules->draw($seat));
    }

    public function pass(Request $request, CardGame $cardGame): RedirectResponse
    {
        return $this->move($request, $cardGame, fn (CardRules $rules, int $seat) => $rules->pass($seat));
    }

    /** "LAATSTE!": announce your last card, or catch someone who forgot. */
    public function last(Request $request, CardGame $cardGame): RedirectResponse
    {
        return $this->move($request, $cardGame, fn (CardRules $rules, int $seat) => $rules->callLast($seat));
    }

    public function resign(Request $request, CardGame $cardGame): RedirectResponse
    {
        $this->giveUp($request->user(), $cardGame, CardGamePlayer::FORFEITED);

        return back();
    }

    /** "Verlaten": counts as giving up while the game is still running. */
    public function leave(Request $request, CardGame $cardGame): RedirectResponse
    {
        $this->giveUp($request->user(), $cardGame, CardGamePlayer::LEFT);

        return to_route('ontmoeten.lobby', ['kamer' => $cardGame->room_id]);
    }

    private function giveUp(User $user, CardGame $cardGame, string $status): void
    {
        abort_unless($cardGame->seatOf($user), 403);

        $this->locked($cardGame, fn (CardGame $game) => $game->forfeit($game->seatOf($user), $status));
    }

    /** @param  Closure(CardRules, int): mixed  $move */
    private function move(Request $request, CardGame $cardGame, Closure $move): RedirectResponse
    {
        $user = $request->user();
        abort_unless($cardGame->seatOf($user), 403);

        $error = $this->locked($cardGame, function (CardGame $game) use ($user, $move) {
            // First whatever was due (an NPC move, a timer), then this move
            $game->advance();

            return $game->act($game->seatOf($user), $move);
        });

        return $error ? back()->withErrors(['move' => $error]) : back();
    }

    /**
     * Run `$callback` on a fresh, locked copy of the game, so two players
     * (or a player and the NPCs) never change the table at the same time.
     *
     * @template T
     *
     * @param  Closure(CardGame): T  $callback
     * @return T
     */
    private function locked(CardGame $cardGame, Closure $callback): mixed
    {
        return DB::transaction(function () use ($cardGame, $callback) {
            $game = CardGame::lockForUpdate()->findOrFail($cardGame->id);
            $game->load('players.user');

            return $callback($game);
        });
    }

    /** @return array<string, list<mixed>> */
    private function tableRules(): array
    {
        return [
            'room_id' => ['required', 'string', Rule::in(self::ROOMS)],
            'table_id' => ['required', 'string', 'max:40', 'regex:/^[a-z0-9-]+$/'],
        ];
    }

    /** @param  array<string, mixed>  $options */
    private function updateSpot(User $user, array $options): void
    {
        $spot = $this->queue->spot($user);
        $spot?->update(['options' => [...$spot->options, ...$options]]);
    }

    /**
     * Where the user stands at the table: `searching` (with who's waiting),
     * `matched` (with the game to go to) or `idle`. Keeps the spot alive and
     * starts the game when it's time.
     *
     * @return array<string, mixed>
     */
    private function queueState(User $user): array
    {
        $game = CardGame::playedBy($user)->active()->latest('id')->first();

        if ($game) {
            return $this->matched($game);
        }

        $spot = $this->queue->spot($user);

        if (! $spot) {
            return ['status' => 'idle'];
        }

        return DB::transaction(function () use ($user, $spot) {
            $waiting = $this->queue->waitingAt($spot->room_id, $spot->table_id);
            $table = $waiting->take((int) config('cards.max_players'))->values();

            if (! $table->contains('user_id', $user->id)) {
                return ['status' => 'searching', 'full' => true, 'players' => [], 'startsInSeconds' => null, 'waitingForPlayers' => false, 'host' => null, 'wins' => CardGame::winsOf($user)];
            }

            $host = $table->first();
            $startNow = $table->contains(fn (GameQueue $s) => $s->option('start_now'));
            $waitForPlayers = $table->contains(fn (GameQueue $s) => $s->option('wait'));
            $since = $table->max(fn (GameQueue $s) => (int) $s->option('since', $s->created_at->getTimestamp()));
            $startsIn = max(0, (int) config('cards.start_after_seconds') - (now()->getTimestamp() - $since));
            $full = $table->count() >= (int) config('cards.max_players');

            if ($full || $startNow || (! $waitForPlayers && $startsIn === 0)) {
                $game = CardGame::start(
                    $host->room_id,
                    $host->table_id,
                    $table->map(fn (GameQueue $s) => $s->user),
                    max($table->count(), (int) config($startNow ? 'cards.start_now_fill_to' : 'cards.min_players')),
                    $host->option('difficulty'),
                    $host->option('house_rules', []),
                );
                $this->queue->remove($table);

                return $this->matched($game);
            }

            return [
                'status' => 'searching',
                'full' => false,
                'players' => $table->map(fn (GameQueue $s) => ['username' => $s->user->username, 'isMe' => $s->user_id === $user->id])->all(),
                'startsInSeconds' => $waitForPlayers ? null : $startsIn,
                'waitingForPlayers' => $waitForPlayers,
                'host' => [
                    'username' => $host->user->username,
                    'isMe' => $host->user_id === $user->id,
                    'difficulty' => $host->option('difficulty'),
                    'houseRules' => $host->option('house_rules', []),
                ],
                'wins' => CardGame::winsOf($user),
            ];
        });
    }

    /** @return array<string, mixed> */
    private function matched(CardGame $game): array
    {
        return [
            'status' => 'matched',
            'gameId' => $game->id,
            'tableId' => $game->table_id,
            'startsAt' => $game->starts_at->toIso8601String(),
            'serverNow' => now()->toIso8601String(),
        ];
    }

    /**
     * The game as this user may see it, in the shape of `CardGameState`
     * (resources/js/types/cards.ts): their own hand, and only the number of
     * cards of everybody else.
     *
     * @return array<string, mixed>
     */
    private function gameState(User $user, CardGame $game): array
    {
        $rules = $game->rules();
        $me = $game->seatOf($user);
        $myTurn = $game->isActive() && ! $game->isDealing() && $rules->turn === $me->seat && $me->status === CardGamePlayer::PLAYING;
        $looks = LobbyPresence::whereIn('user_id', $game->players->pluck('user_id')->filter())->pluck('look', 'user_id');

        return [
            'id' => $game->id,
            'roomId' => $game->room_id,
            'tableId' => $game->table_id,
            'status' => match (true) {
                ! $game->isActive() => 'finished',
                $game->starts_at->isFuture() => 'countdown',
                $game->isDealing() => 'dealing',
                default => 'active',
            },
            'startsAt' => $game->starts_at->toIso8601String(),
            'serverNow' => now()->toIso8601String(),
            'serverNowMs' => CardGame::nowMs(),
            'playStartsAtMs' => $game->playStartsAtMs(),
            'turnEndsAtMs' => $game->isActive() ? $game->turn_ends_at_ms : null,
            'turnSeconds' => (int) config('cards.turn_seconds'),
            'mySeat' => $me->seat,
            'myStatus' => $me->status,
            'seats' => $game->players->map(fn (CardGamePlayer $p) => [
                'seat' => $p->seat,
                'username' => $p->user?->username ?? $p->npc_name ?? 'NPC',
                'isNpc' => $p->user_id === null,
                'isMe' => $p->is($me),
                'status' => $p->status,
                'look' => $p->npc_look ?? $looks[$p->user_id] ?? null,
                'cardCount' => count($rules->hand($p->seat)),
                'cardsLeft' => $p->cards_left,
                'isWinner' => $p->is_winner,
            ])->values(),
            'hand' => $rules->hand($me->seat),
            'playable' => $myTurn ? $rules->playable($me->seat) : [],
            'drawn' => $myTurn ? $rules->drawn : null,
            'top' => $rules->top(),
            'color' => $rules->color,
            'direction' => $rules->direction,
            'turn' => $rules->turn,
            'pendingDraw' => $rules->pendingDraw,
            'drawPileCount' => count($rules->drawPile),
            'houseRules' => $game->house_rules,
            'npcDifficulty' => $game->npc_difficulty,
            'turns' => $game->turns,
            'events' => $game->events,
            'winnerSeat' => $game->winner_seat,
            'endReason' => $game->end_reason,
            'wins' => CardGame::winsOf($user),
        ];
    }
}
