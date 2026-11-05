<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use PChess\Chess\Board;
use PChess\Chess\Chess;
use PChess\Chess\Piece;

/**
 * A chess game at a board in the Hotel, between two students or a student
 * and the NPC (the side whose user id is null). The rules come from
 * p-chess/chess, a PHP port of chess.js, so the server decides which moves
 * are legal and when the game is over.
 *
 * @property int $id
 * @property string $room_id
 * @property string $board_id
 * @property int|null $white_id
 * @property int|null $black_id
 * @property string|null $npc_difficulty
 * @property string $fen
 * @property list<string> $moves
 * @property string $pgn
 * @property string $status
 * @property string|null $result
 * @property string|null $winner
 * @property string|null $end_reason
 * @property Carbon|null $white_seen_at
 * @property Carbon|null $black_seen_at
 * @property Carbon $starts_at
 * @property Carbon|null $ended_at
 * @property-read User|null $white
 * @property-read User|null $black
 */
class ChessGame extends Model
{
    public const WHITE = 'white';

    public const BLACK = 'black';

    protected $fillable = [
        'room_id',
        'board_id',
        'white_id',
        'black_id',
        'npc_difficulty',
        'fen',
        'moves',
        'pgn',
        'status',
        'result',
        'winner',
        'end_reason',
        'white_seen_at',
        'black_seen_at',
        'starts_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'moves' => 'array',
            'white_seen_at' => 'datetime',
            'black_seen_at' => 'datetime',
            'starts_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    /**
     * A new game that starts after the countdown. `$white`/`$black` null
     * means the NPC plays that side.
     */
    public static function start(string $roomId, string $boardId, ?User $white, ?User $black, ?string $npcDifficulty = null): self
    {
        return self::create([
            'room_id' => $roomId,
            'board_id' => $boardId,
            'white_id' => $white?->id,
            'black_id' => $black?->id,
            'npc_difficulty' => $npcDifficulty,
            'fen' => Board::DEFAULT_POSITION,
            'moves' => [],
            'pgn' => '',
            'status' => 'active',
            'white_seen_at' => now(),
            'black_seen_at' => now(),
            'starts_at' => now()->addSeconds((int) config('chess.countdown_seconds')),
        ]);
    }

    /** @return BelongsTo<User, $this> */
    public function white(): BelongsTo
    {
        return $this->belongsTo(User::class, 'white_id');
    }

    /** @return BelongsTo<User, $this> */
    public function black(): BelongsTo
    {
        return $this->belongsTo(User::class, 'black_id');
    }

    /**
     * Games the user plays in.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeFor(Builder $query, User $user): Builder
    {
        return $query->where(fn (Builder $q) => $q
            ->where('white_id', $user->id)
            ->orWhere('black_id', $user->id));
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /** Still counting down: no moves yet. */
    public function isCountingDown(): bool
    {
        return $this->isActive() && $this->starts_at->isFuture();
    }

    public function hasParticipant(User $user): bool
    {
        return $this->colorOf($user) !== null;
    }

    /** `white`, `black` or null when the user doesn't play in this game. */
    public function colorOf(User $user): ?string
    {
        return match ($user->id) {
            $this->white_id => self::WHITE,
            $this->black_id => self::BLACK,
            default => null,
        };
    }

    public function isNpc(string $color): bool
    {
        return $this->npc_difficulty !== null && $this->{$color.'_id'} === null;
    }

    public static function opposite(string $color): string
    {
        return $color === self::WHITE ? self::BLACK : self::WHITE;
    }

    /** Whose move it is, read from the FEN. */
    public function turn(): string
    {
        return explode(' ', $this->fen)[1] === Piece::WHITE ? self::WHITE : self::BLACK;
    }

    /** May this user make the move that's up now (their own, or the NPC's)? */
    public function mayMove(User $user): bool
    {
        $turn = $this->turn();

        return $this->colorOf($user) === $turn
            || ($this->isNpc($turn) && $this->hasParticipant($user));
    }

    /**
     * Play a move (squares like `e2` → `e4`, promotion `q|r|b|n`). Returns
     * false when the move is illegal; ends the game on mate or a draw.
     */
    public function play(string $from, string $to, ?string $promotion = null): bool
    {
        $chess = $this->replay();
        $move = $chess->move(['from' => $from, 'to' => $to, 'promotion' => $promotion ?? 'q']);

        if ($move === null) {
            return false;
        }

        $this->moves = [...$this->moves, $from.$to.($move->promotion ?? '')];
        $this->fen = $chess->fen();
        $this->pgn = trim($this->pgn.' '.$this->pgnPrefix(count($this->moves)).$move->san);

        $ending = match (true) {
            $chess->inCheckmate() => ['checkmate', self::opposite($this->turn())],
            $chess->inStalemate() => ['stalemate', null],
            $chess->insufficientMaterial() => ['insufficient-material', null],
            $chess->inThreefoldRepetition() => ['threefold-repetition', null],
            $chess->halfMovesExceeded() => ['fifty-moves', null],
            default => null,
        };

        if ($ending) {
            $this->finish($ending[0], $ending[1]);
        } else {
            $this->save();
        }

        return true;
    }

    /** End the game; `$winner` null is a draw. Does nothing once it's over. */
    public function finish(string $reason, ?string $winner): void
    {
        if (! $this->isActive()) {
            return;
        }

        $this->fill([
            'status' => 'finished',
            'end_reason' => $reason,
            'winner' => $winner,
            'result' => match ($winner) {
                self::WHITE => '1-0',
                self::BLACK => '0-1',
                default => '1/2-1/2',
            },
            'ended_at' => now(),
        ])->save();
    }

    /** The user gives up (resign, or leaving a running game): the other side wins. */
    public function forfeit(User $user, string $reason): void
    {
        $color = $this->colorOf($user);

        if ($color !== null) {
            $this->finish($reason, self::opposite($color));
        }
    }

    /** The game rebuilt from all moves, so repetition draws are detected too. */
    private function replay(): Chess
    {
        $chess = new Chess;

        foreach ($this->moves as $uci) {
            $chess->move(['from' => substr($uci, 0, 2), 'to' => substr($uci, 2, 2), 'promotion' => substr($uci, 4, 1) ?: null]);
        }

        return $chess;
    }

    /** "1. " before a white move in the PGN. */
    private function pgnPrefix(int $ply): string
    {
        return $ply % 2 === 1 ? intdiv($ply + 1, 2).'. ' : '';
    }
}
