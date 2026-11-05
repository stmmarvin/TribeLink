<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * An anonymous chat between two students matched by Random chat.
 *
 * @property int $user_one_id
 * @property int $user_two_id
 * @property Carbon|null $ended_at
 * @property int|null $ended_by
 * @property string|null $end_reason
 */
class RandomChat extends Model
{
    protected $fillable = [
        'user_one_id',
        'user_two_id',
        'user_one_seen_at',
        'user_two_seen_at',
        'user_one_saved',
        'user_two_saved',
        'ended_at',
        'ended_by',
        'end_reason',
    ];

    protected function casts(): array
    {
        return [
            'user_one_seen_at' => 'datetime',
            'user_two_seen_at' => 'datetime',
            'user_one_saved' => 'boolean',
            'user_two_saved' => 'boolean',
            'ended_at' => 'datetime',
        ];
    }

    public function userOne(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_one_id');
    }

    public function userTwo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_two_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(RandomChatMessage::class);
    }

    /** Chats the user takes part in. */
    public function scopeFor(Builder $query, User $user): Builder
    {
        return $query->where(fn (Builder $q) => $q
            ->where('user_one_id', $user->id)
            ->orWhere('user_two_id', $user->id));
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('ended_at');
    }

    public function hasParticipant(User $user): bool
    {
        return in_array($user->id, [$this->user_one_id, $this->user_two_id], true);
    }

    public function partnerOf(User $user): User
    {
        return $this->user_one_id === $user->id ? $this->userTwo : $this->userOne;
    }

    /** Column prefix for the user's side of the chat: `user_one` or `user_two`. */
    public function sideOf(User $user): string
    {
        return $this->user_one_id === $user->id ? 'user_one' : 'user_two';
    }

    public function end(User $by, string $reason): void
    {
        if ($this->ended_at === null) {
            $this->update(['ended_at' => now(), 'ended_by' => $by->id, 'end_reason' => $reason]);
        }
    }
}
