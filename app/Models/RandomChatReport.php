<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RandomChatReport extends Model
{
    protected $fillable = ['random_chat_id', 'reporter_id', 'reported_id', 'reason', 'details'];
}
