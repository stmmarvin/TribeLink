<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A friend request from `user_id` to `friend_id`. Once accepted, a second
 * row in the other direction is added so `User::friends()` works both ways.
 */
class Friendship extends Model
{
    protected $table = 'user_friendships';

    protected $fillable = ['user_id', 'friend_id', 'accepted_at'];

    protected function casts(): array
    {
        return [
            'accepted_at' => 'datetime',
        ];
    }

    /**
     * The user who sent the request
     *
     * @return BelongsTo<User, $this>
     */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * The user who received the request
     *
     * @return BelongsTo<User, $this>
     */
    public function addressee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'friend_id');
    }

    /**
     * The friendship between two users, whoever sent the request
     *
     * @param  Builder<Friendship>  $query
     * @return Builder<Friendship>
     */
    public function scopeBetween(Builder $query, User $a, User $b): Builder
    {
        return $query->where(function (Builder $query) use ($a, $b) {
            $query->where(fn (Builder $q) => $q->where('user_id', $a->id)->where('friend_id', $b->id))
                ->orWhere(fn (Builder $q) => $q->where('user_id', $b->id)->where('friend_id', $a->id));
        });

    }
}
