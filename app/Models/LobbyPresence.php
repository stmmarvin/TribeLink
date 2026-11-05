<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LobbyPresence extends Model
{
    /** The open rooms of the Hotel, id => name. */
    public const ROOMS = [
        'kantine' => 'Kantine',
        'arcade' => 'Arcade',
        // Tijdelijk offline (ook in resources/js/game/rooms.ts → ONLINE_ROOM_IDS):
        // 'spelletjeshoek' => 'Spelletjeshoek',
        // 'rustige-lounge' => 'Rustige lounge',
        // 'eerstejaars-hal' => 'Eerstejaars-hal',
    ];

    /** Someone seen in the Hotel within this many seconds counts as online. */
    public const ACTIVE_SECONDS = 75;

    protected $fillable = [
        'user_id',
        'room_id',
        'game_proposal',
        'last_seen_at',
        'x',
        'y',
        'dir',
        'look',
        'sitting',
        'dancing',
        'typing',
        'waves',
    ];

    protected function casts(): array
    {
        return [
            'last_seen_at' => 'datetime',
            'look' => 'array',
            'sitting' => 'boolean',
            'dancing' => 'boolean',
            'typing' => 'boolean',
        ];
    }

    /**
     * Only people who are in the Hotel right now.
     *
     * @param  Builder<self>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('last_seen_at', '>=', now()->subSeconds(self::ACTIVE_SECONDS));
    }

    /**
     * Every open room with how many people are in it now.
     *
     * @return list<array{id: string, name: string, peopleCount: int, imageUrl: null}>
     */
    public static function roomSummaries(): array
    {
        return collect(self::ROOMS)->map(fn (string $name, string $id): array => [
            'id' => $id,
            'name' => $name,
            'peopleCount' => self::active()->where('room_id', $id)->count(),
            'imageUrl' => null,
        ])->values()->all();
    }

    /** How many different people are in the Hotel right now. */
    public static function onlineCount(): int
    {
        return self::active()->distinct('user_id')->count('user_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
