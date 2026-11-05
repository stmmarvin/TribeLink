<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A student waiting at a game table in the Hotel (a chess board, the
 * Tribekaarten table). See App\Games\Matchmaking.
 *
 * @property int $id
 * @property int $user_id
 * @property string $game
 * @property string $room_id
 * @property string $table_id
 * @property array<string, mixed> $options
 * @property Carbon $last_seen_at
 * @property Carbon $created_at
 * @property-read User $user
 */
class GameQueue extends Model
{
    protected $table = 'game_queue';

    protected $fillable = ['user_id', 'game', 'room_id', 'table_id', 'options', 'last_seen_at'];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'last_seen_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function option(string $key, mixed $default = null): mixed
    {
        return $this->options[$key] ?? $default;
    }
}
