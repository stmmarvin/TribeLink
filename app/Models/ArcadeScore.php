<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One run of an arcade game in the Hotel. Created when the game starts
 * (ArcadeController::start); score and stats are filled in when it
 * ends. Unfinished runs never show up on a leaderboard.
 *
 * @property int $id
 * @property int $user_id
 * @property string $game
 * @property int|null $score
 * @property array<string, int>|null $stats
 * @property Carbon $started_at
 * @property Carbon|null $finished_at
 * @property-read User $user
 */
class ArcadeScore extends Model
{
    protected $fillable = ['user_id', 'game', 'score', 'stats', 'started_at', 'finished_at'];

    protected function casts(): array
    {
        return [
            'stats' => 'array',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @param Builder<self> $query */
    public function scopeFinished(Builder $query): void
    {
        $query->whereNotNull('finished_at');
    }

    public function isFinished(): bool
    {
        return $this->finished_at !== null;
    }

    /**
     * Best score per player for a game, highest first. `$since` limits it to
     * runs finished from then on (today, this week); null is all-time.
     *
     * @return list<array{rank: int, userId: int, username: string, score: int}>
     */
    public static function leaderboard(string $game, ?CarbonInterface $since = null, ?int $limit = null): array
    {
        $rows = self::query()
            ->finished()
            ->where('game', $game)
            ->when($since, fn (Builder $query) => $query->where('finished_at', '>=', $since))
            ->selectRaw('user_id, MAX(score) as best')
            ->groupBy('user_id')
            ->orderByDesc('best')
            ->orderBy('user_id')
            ->limit($limit ?? (int) config('arcade.leaderboard_size'))
            ->get();

        $users = User::whereIn('id', $rows->pluck('user_id'))->get(['id', 'username'])->keyBy('id');

        return $rows->values()->map(fn (self $row, int $i): array => [
            'rank' => $i + 1,
            'userId' => (int) $row->user_id,
            'username' => $users[$row->user_id]?->username ?? 'student',
            'score' => (int) $row->getAttribute('best'),
        ])->all();
    }

    /** The user's highest finished score for a game (0 if they never finished a run). */
    public static function personalBest(User $user, string $game): int
    {
        return (int) self::query()->finished()->where('game', $game)->where('user_id', $user->id)->max('score');
    }

    /**
     * Today, this week and all-time, for the cabinet popup, the game page and
     * the scoreboard on the wall.
     *
     * @return array{today: list<array<string, mixed>>, week: list<array<string, mixed>>, allTime: list<array<string, mixed>>}
     */
    public static function leaderboards(string $game): array
    {
        return [
            'today' => self::leaderboard($game, now()->startOfDay()),
            'week' => self::leaderboard($game, now()->startOfWeek(CarbonInterface::MONDAY)),
            'allTime' => self::leaderboard($game),
        ];
    }
}
