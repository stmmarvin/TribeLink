<?php

use App\Arcade\StackRules;
use App\Arcade\WaveRushRules;

return [

    /*
    |--------------------------------------------------------------------------
    | Arcade in het hotel
    |--------------------------------------------------------------------------
    |
    | The playable cabinets in the Arcade room. Every game stores its runs in
    | `arcade_scores` (one row per run, with its own `stats`), so a new game
    | needs an entry here, an App\Arcade\ArcadeRules class, its Inertia page
    | and a cabinet in resources/js/game/rooms.ts.
    |
    */

    'games' => [
        'stack' => [
            'name' => 'Stack',
            // Inertia page that runs the game
            'page' => 'ontmoeten/stack',
            'rules' => StackRules::class,
            // Nobody places a block faster than this, so a score that needs
            // less time than blocks × this is rejected
            'min_ms_per_block' => (int) env('ARCADE_STACK_MIN_MS_PER_BLOCK', 250),
            // A perfect drop is worth at most this many bonus points
            // (resources/js/game/stack/logic.ts → MAX_PERFECT_BONUS)
            'max_perfect_bonus' => 3,
        ],
        'wave-rush' => [
            'name' => 'Wave Rush',
            'page' => 'ontmoeten/wave-rush',
            'rules' => WaveRushRules::class,
            // Boost speed plus some slack (resources/js/game/wave-rush/player.ts → BOOST_SPEED)
            'max_speed_mps' => 90,
            // Bonus points (player.ts → POINTS)
            'points' => ['coin' => 25, 'boost' => 10, 'trick' => 150],
            // The track never places these closer together (track.ts / obstacles.ts)
            'min_metres_between' => ['coin' => 4, 'boost' => 120, 'ramp' => 150],
        ],
    ],

    // A run that isn't submitted within this long can't be submitted anymore
    'max_run_minutes' => (int) env('ARCADE_MAX_RUN_MINUTES', 60),

    // How many players a leaderboard shows
    'leaderboard_size' => 10,

];
