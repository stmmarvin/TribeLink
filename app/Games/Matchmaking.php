<?php

namespace App\Games;

use App\Models\GameQueue;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * The waiting queue at the game tables in the Hotel, shared by chess and
 * Tribekaarten. Clicking a table puts you in its queue (`join`); the Hotel
 * then polls every second, which keeps your spot alive (`spot`). Each game
 * decides itself when the people waiting at a table (`waitingAt`) start
 * playing, and fills empty seats with NPCs.
 *
 * Timings come from config("{game}.queue_timeout_seconds") and
 * config("{game}.disconnect_timeout_seconds").
 */
class Matchmaking
{
    public function __construct(public readonly string $game) {}

    /** Wait at a table. Delete + create (not update), so waiting times start again. */
    public function join(User $user, string $roomId, string $tableId, array $options = []): GameQueue
    {
        GameQueue::where('user_id', $user->id)->delete();

        return GameQueue::create([
            'user_id' => $user->id,
            'game' => $this->game,
            'room_id' => $roomId,
            'table_id' => $tableId,
            'options' => $options,
            'last_seen_at' => now(),
        ]);
    }

    public function leave(User $user): void
    {
        GameQueue::where('user_id', $user->id)->where('game', $this->game)->delete();
    }

    /**
     * The user's live spot in this game's queue, refreshed (they just polled).
     * A spot that wasn't polled for too long is removed: null.
     */
    public function spot(User $user): ?GameQueue
    {
        $spot = GameQueue::where('user_id', $user->id)->where('game', $this->game)->first();

        if (! $spot || ! $this->isOnline($spot)) {
            $spot?->delete();

            return null;
        }

        $spot->update(['last_seen_at' => now()]);

        return $spot;
    }

    /**
     * Everyone still polling at the spot's table, the spot itself included,
     * longest waiting first. Locked: call it inside a transaction.
     *
     * @return Collection<int, GameQueue>
     */
    public function waitingAt(string $roomId, string $tableId): Collection
    {
        return GameQueue::query()
            ->where('game', $this->game)
            ->where('room_id', $roomId)
            ->where('table_id', $tableId)
            ->where('last_seen_at', '>=', now()->subSeconds($this->config('queue_timeout_seconds')))
            ->oldest()
            ->orderBy('id')
            ->lockForUpdate()
            ->get();
    }

    /**
     * @param  iterable<GameQueue>  $spots
     */
    public function remove(iterable $spots): void
    {
        GameQueue::whereIn('id', collect($spots)->pluck('id'))->delete();
    }

    public function isOnline(GameQueue $spot): bool
    {
        return $spot->last_seen_at->gte(now()->subSeconds($this->config('queue_timeout_seconds')));
    }

    /** Seconds left of a wait that started at `$since` and lasts `$seconds`. */
    public static function secondsLeft(CarbonInterface $since, int $seconds): int
    {
        return max(0, $seconds - (int) $since->diffInSeconds(now()));
    }

    /**
     * Has a player at a running game stopped polling for too long? Then the
     * game lets them lose on time (chess) or gives their seat to an NPC
     * (Tribekaarten).
     */
    public function isDisconnected(?CarbonInterface $seenAt): bool
    {
        return $seenAt === null || $seenAt->lt(now()->subSeconds($this->config('disconnect_timeout_seconds')));
    }

    private function config(string $key): int
    {
        return (int) config("{$this->game}.{$key}");
    }
}
