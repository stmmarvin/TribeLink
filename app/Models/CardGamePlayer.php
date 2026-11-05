<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One seat at a Tribekaarten game: a student, or an NPC (no user, or a
 * student whose seat an NPC took over after a disconnect).
 *
 * @property int $id
 * @property int $card_game_id
 * @property int $seat
 * @property int|null $user_id
 * @property string|null $npc_name
 * @property array<string, mixed>|null $npc_look
 * @property string $status
 * @property Carbon|null $seen_at
 * @property int|null $cards_left
 * @property bool $is_winner
 * @property-read User|null $user
 * @property-read CardGame $game
 */
class CardGamePlayer extends Model
{
    public const PLAYING = 'playing';

    public const NPC = 'npc';

    public const TAKEN_OVER = 'taken-over';

    public const FORFEITED = 'forfeited';

    public const LEFT = 'left';

    protected $fillable = ['card_game_id', 'seat', 'user_id', 'npc_name', 'npc_look', 'status', 'seen_at', 'cards_left', 'is_winner'];

    protected function casts(): array
    {
        return [
            'npc_look' => 'array',
            'seen_at' => 'datetime',
            'is_winner' => 'boolean',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<CardGame, $this> */
    public function game(): BelongsTo
    {
        return $this->belongsTo(CardGame::class, 'card_game_id');
    }

    /** An NPC plays this seat (from the start, or after a disconnect). */
    public function isNpcControlled(): bool
    {
        return in_array($this->status, [self::NPC, self::TAKEN_OVER], true);
    }

    public function hasLeft(): bool
    {
        return in_array($this->status, [self::FORFEITED, self::LEFT], true);
    }
}
