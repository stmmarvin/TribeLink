<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Schaken in het hotel
    |--------------------------------------------------------------------------
    |
    | Timings for the chess boards in the Hotel. All values are in seconds.
    |
    */

    // A lone player at a board plays the NPC after waiting this long
    'npc_wait_seconds' => (int) env('CHESS_NPC_WAIT_SECONDS', 5),

    // A queued player who hasn't polled for this long is no longer "online"
    'queue_timeout_seconds' => (int) env('CHESS_QUEUE_TIMEOUT_SECONDS', 4),

    // The 3 → 2 → 1 → 0 countdown before the first move
    'countdown_seconds' => (int) env('CHESS_COUNTDOWN_SECONDS', 4),

    // A real opponent who hasn't polled for this long loses on time
    'disconnect_timeout_seconds' => (int) env('CHESS_DISCONNECT_TIMEOUT_SECONDS', 30),

    // The computer opponent for players who wait alone
    'npc' => [
        'name' => 'Bot1',
        'difficulties' => ['easy', 'normal', 'hard'],
        'default_difficulty' => 'normal',
    ],

];
