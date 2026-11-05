<?php

namespace App\Models;

use App\Games\Cards\CardNpc;
use App\Games\Cards\CardRules;
use App\Games\Cards\IllegalMove;
use App\Games\Matchmaking;
use App\Games\NpcRoster;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A game of Tribekaarten at the card table in the Hotel, with 2–4 players
 * (students and NPCs). The rules live in App\Games\Cards\CardRules; this
 * model stores them and runs the table: NPC moves after a natural pause,
 * the turn timer, NPCs pressing "LAATSTE!", and NPCs taking over the seat
 * of a student who disconnected.
 *
 * There are no websockets or queue workers: every poll of a player calls
 * `advance()`, which does whatever has become due since.
 *
 * @property int $id
 * @property string $room_id
 * @property string $table_id
 * @property string $npc_difficulty
 * @property list<string> $house_rules
 * @property array<string, mixed> $state
 * @property list<array<string, mixed>> $events
 * @property int $event_seq
 * @property string $status
 * @property int|null $winner_seat
 * @property string|null $end_reason
 * @property int $turns
 * @property int|null $turn_ends_at_ms
 * @property int|null $npc_acts_at_ms
 * @property int|null $catch_at_ms
 * @property int|null $catch_by
 * @property Carbon $starts_at
 * @property Carbon|null $ended_at
 * @property-read Collection<int, CardGamePlayer> $players
 */
class CardGame extends Model
{
    /** Events kept for the animations at the table. */
    private const KEEP_EVENTS = 40;

    protected $fillable = [
        'room_id',
        'table_id',
        'npc_difficulty',
        'house_rules',
        'state',
        'events',
        'event_seq',
        'status',
        'winner_seat',
        'end_reason',
        'turns',
        'turn_ends_at_ms',
        'npc_acts_at_ms',
        'catch_at_ms',
        'catch_by',
        'starts_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'house_rules' => 'array',
            'state' => 'array',
            'events' => 'array',
            'starts_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    /**
     * A new game: the students sit down at random seats, NPCs fill the table
     * up to `$fillTo` players, and the cards are dealt. Play starts after the
     * countdown and the dealing.
     *
     * @param  iterable<User>  $users
     * @param  list<string>  $houseRules
     */
    public static function start(string $roomId, string $tableId, iterable $users, int $fillTo, string $difficulty, array $houseRules = []): self
    {
        $users = collect($users)->values();
        $npcs = (new NpcRoster('cards'))->pick(max(0, $fillTo - $users->count()));
        $seats = $users->map(fn (User $user) => ['user' => $user])
            ->concat(array_map(fn (array $npc) => ['npc' => $npc], $npcs))
            ->shuffle()
            ->values();

        $rules = CardRules::deal($seats->count(), $houseRules, handSize: (int) config('cards.hand_size'), penalty: (int) config('cards.last_card_penalty'));
        $game = self::create([
            'room_id' => $roomId,
            'table_id' => $tableId,
            'npc_difficulty' => $difficulty,
            'house_rules' => $houseRules,
            'state' => $rules->toArray(),
            'events' => [],
            'status' => 'active',
            'starts_at' => now()->addSeconds((int) config('cards.countdown_seconds')),
        ]);

        foreach ($seats as $seat => $player) {
            $game->players()->create([
                'seat' => $seat,
                'user_id' => isset($player['user']) ? $player['user']->id : null,
                'npc_name' => $player['npc']['name'] ?? null,
                'npc_look' => $player['npc']['look'] ?? null,
                'status' => isset($player['user']) ? CardGamePlayer::PLAYING : CardGamePlayer::NPC,
                'seen_at' => now(),
            ]);
        }

        $playStarts = $game->playStartsAtMs();
        $game->fill([
            'turn_ends_at_ms' => $playStarts + (int) config('cards.turn_seconds') * 1000,
            'npc_acts_at_ms' => $playStarts + self::npcDelay(),
        ]);
        $game->record($rules);
        $game->save();

        return $game;
    }

    /** @return HasMany<CardGamePlayer, $this> */
    public function players(): HasMany
    {
        return $this->hasMany(CardGamePlayer::class)->orderBy('seat');
    }

    /**
     * Games the user (still) plays in themselves.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopePlayedBy(Builder $query, User $user): Builder
    {
        return $query->whereHas('players', fn (Builder $q) => $q
            ->where('user_id', $user->id)
            ->where('status', CardGamePlayer::PLAYING));
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    /** Games this user won. */
    public static function winsOf(User $user): int
    {
        return CardGamePlayer::where('user_id', $user->id)->where('is_winner', true)->count();
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /** Countdown or dealing: nobody can play yet. */
    public function isDealing(): bool
    {
        return $this->isActive() && self::nowMs() < $this->playStartsAtMs();
    }

    public function playStartsAtMs(): int
    {
        return $this->starts_at->getTimestampMs() + (int) config('cards.deal_seconds') * 1000;
    }

    public function seatOf(User $user): ?CardGamePlayer
    {
        return $this->players->firstWhere('user_id', $user->id);
    }

    public function rules(): CardRules
    {
        return CardRules::fromArray($this->state, penalty: (int) config('cards.last_card_penalty'));
    }

    /**
     * Do a move for this player (`$move` gets the rules and their seat).
     * Returns the reason when it isn't allowed, null when it was done.
     *
     * @param  Closure(CardRules, int): mixed  $move
     */
    public function act(CardGamePlayer $player, Closure $move): ?string
    {
        if (! $this->isActive()) {
            return 'Het potje is al afgelopen.';
        }

        if ($this->isDealing()) {
            return 'Het potje begint zo.';
        }

        if ($player->status !== CardGamePlayer::PLAYING) {
            return 'Je speelt niet meer mee aan deze tafel.';
        }

        $rules = $this->rules();
        $before = $this->snapshot($rules);

        try {
            $move($rules, $player->seat);
        } catch (IllegalMove $e) {
            return $e->getMessage();
        }

        $this->commit($rules, $before);

        return null;
    }

    /**
     * Give up or leave (`$status` forfeited / left): the hand goes back into
     * the draw pile and the others play on. Without students left the game ends.
     */
    public function forfeit(CardGamePlayer $player, string $status): void
    {
        if (! $this->isActive() || $player->status !== CardGamePlayer::PLAYING) {
            return;
        }

        $player->update(['status' => $status]);
        $rules = $this->rules();
        $before = $this->snapshot($rules);
        $rules->forfeit($player->seat);
        $this->commit($rules, $before, 'last-standing');
        $this->endWithoutStudents();
    }

    /**
     * Everything that has become due since the last poll: seats of
     * disconnected students go to an NPC, NPCs press "LAATSTE!" and make
     * their move, and an expired turn timer draws for the player.
     */
    public function advance(): void
    {
        if (! $this->isActive() || $this->isDealing()) {
            return;
        }

        $queue = new Matchmaking('cards');
        $rules = $this->rules();

        foreach ($this->players as $player) {
            if ($player->status === CardGamePlayer::PLAYING && $queue->isDisconnected($player->seen_at)) {
                $player->update(['status' => CardGamePlayer::TAKEN_OVER]);
                $rules->events[] = ['type' => 'takeover', 'seat' => $player->seat];
            }
        }

        $this->record($rules);
        $this->save();

        if ($this->endWithoutStudents()) {
            return;
        }

        // Several steps when nobody polled for a while; NPC moves are spaced by their delay
        for ($step = 0; $step < 8 && $this->isActive(); $step++) {
            $rules = $this->rules();
            $before = $this->snapshot($rules);
            $now = self::nowMs();
            $player = $this->players->firstWhere('seat', $rules->turn);

            if ($this->catch_at_ms !== null && $now >= $this->catch_at_ms) {
                $this->catch_at_ms = null;
                $rules->callLast((int) $this->catch_by);
            } elseif ($player->isNpcControlled() && $now >= $this->npc_acts_at_ms) {
                $this->npcMove($rules, $player->seat);
            } elseif (! $player->isNpcControlled() && $now >= $this->turn_ends_at_ms) {
                $rules->timeout($player->seat);
            } else {
                break;
            }

            $this->commit($rules, $before);
        }
    }

    private function npcMove(CardRules $rules, int $seat): void
    {
        $npc = new CardNpc($this->npc_difficulty);
        $choice = $npc->decide($rules, $seat);

        match ($choice['action']) {
            'play' => $rules->play($seat, $choice['card'], $choice['color'], $choice['target']),
            'draw' => $rules->draw($seat),
            'pass' => $rules->pass($seat),
        };

        // Most of the time the NPC remembers "LAATSTE!" right away; otherwise it is late (see scheduleCatch)
        if ($rules->catchable === $seat && $npc->remembersLast((float) config("cards.npc.calls_last.{$this->npc_difficulty}"))) {
            $rules->callLast($seat);
        }
    }

    /** @return array{int, ?string, int, ?int} */
    private function snapshot(CardRules $rules): array
    {
        return [$rules->turn, $rules->drawn, $rules->turns, $rules->catchable];
    }

    /**
     * Store the rules after a move: reset the timers when the turn moved on,
     * plan NPCs pressing "LAATSTE!", and finish the game when someone won.
     *
     * @param  array{int, ?string, int, ?int}  $before
     */
    private function commit(CardRules $rules, array $before, string $winReason = 'won'): void
    {
        [$turn, $drawn, $turns, $catchable] = $before;
        $now = self::nowMs();

        if ($rules->turn !== $turn || $rules->turns !== $turns) {
            $this->turn_ends_at_ms = $now + (int) config('cards.turn_seconds') * 1000;
            $this->npc_acts_at_ms = $now + self::npcDelay();
        } elseif ($rules->drawn !== $drawn) {
            $this->npc_acts_at_ms = $now + self::npcDelay();
        }

        if ($rules->catchable !== $catchable) {
            $this->scheduleCatch($rules, $now);
        }

        $this->turns = $rules->turns;
        $this->record($rules);

        if ($rules->isFinished()) {
            $this->finish($winReason, $rules);
        } else {
            $this->save();
        }
    }

    /**
     * Someone is down to one card without "LAATSTE!": an NPC opponent may
     * catch them after a moment, and a forgetful NPC remembers it late.
     */
    private function scheduleCatch(CardRules $rules, int $now): void
    {
        $this->catch_at_ms = null;
        $this->catch_by = null;
        $target = $rules->catchable;

        if ($target === null) {
            return;
        }

        $npcSeats = $this->players
            ->filter(fn (CardGamePlayer $p) => $p->isNpcControlled() && ! $rules->isOut($p->seat))
            ->pluck('seat');
        $chance = (float) config("cards.npc.catches.{$this->npc_difficulty}");
        $catcher = $npcSeats->reject(fn (int $seat) => $seat === $target)
            ->first(fn () => mt_rand() / mt_getrandmax() < $chance);

        if ($catcher !== null) {
            [$this->catch_at_ms, $this->catch_by] = [$now + random_int(1200, 2500), $catcher];
        } elseif ($npcSeats->contains($target)) {
            [$this->catch_at_ms, $this->catch_by] = [$now + random_int(2500, 4000), $target];
        }
    }

    /** Append the new events of the rules (numbered) and store their state. */
    private function record(CardRules $rules): void
    {
        $events = $this->events ?? [];

        foreach ($rules->events as $event) {
            $events[] = ['id' => ++$this->event_seq, ...$event];
        }

        $rules->events = [];
        $this->events = array_slice($events, -self::KEEP_EVENTS);
        $this->state = $rules->toArray();
    }

    /** All students gave up, left or disconnected: nobody plays on. */
    private function endWithoutStudents(): bool
    {
        if (! $this->isActive() || $this->players->contains('status', CardGamePlayer::PLAYING)) {
            return false;
        }

        $this->finish('abandoned', $this->rules());

        return true;
    }

    private function finish(string $reason, CardRules $rules): void
    {
        $this->fill([
            'status' => 'finished',
            'end_reason' => $reason,
            'winner_seat' => $rules->winner,
            'turn_ends_at_ms' => null,
            'npc_acts_at_ms' => null,
            'catch_at_ms' => null,
            'catch_by' => null,
            'ended_at' => now(),
        ])->save();

        foreach ($this->players as $player) {
            $player->update([
                'cards_left' => count($rules->hand($player->seat)),
                'is_winner' => $rules->winner === $player->seat,
            ]);
        }
    }

    private static function npcDelay(): int
    {
        [$min, $max] = config('cards.npc.delay_ms');

        return random_int($min, $max);
    }

    public static function nowMs(): int
    {
        return (int) now()->getTimestampMs();
    }
}
