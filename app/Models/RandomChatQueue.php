<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A student waiting to be matched by Random chat. */
class RandomChatQueue extends Model
{
    protected $table = 'random_chat_queue';

    protected $fillable = ['user_id', 'last_seen_at'];

    protected function casts(): array
    {
        return ['last_seen_at' => 'datetime'];
    }
}
