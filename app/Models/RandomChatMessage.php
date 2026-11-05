<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RandomChatMessage extends Model
{
    protected $fillable = ['random_chat_id', 'user_id', 'body'];

    public function randomChat(): BelongsTo
    {
        return $this->belongsTo(RandomChat::class);
    }
}
