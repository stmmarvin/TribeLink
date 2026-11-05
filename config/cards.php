<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Tribekaarten in het hotel
    |--------------------------------------------------------------------------
    |
    | The card table in the Kantine (App\Games\Cards). Times are in seconds
    | unless the key says otherwise.
    |
    */

    // Players per game
    'min_players' => 2,
    'max_players' => 4,

    // Nobody presses a button: the game starts this long after the last player sat down
    'start_after_seconds' => (int) env('CARDS_START_AFTER_SECONDS', 10),

    // "Nu starten met NPC's" fills the table up to this many players
    'start_now_fill_to' => 4,

    // A queued player who hasn't polled for this long is no longer "online"
    'queue_timeout_seconds' => (int) env('CARDS_QUEUE_TIMEOUT_SECONDS', 4),

    // The 3 → 2 → 1 → 0 countdown, plus the time for shuffling and dealing at the table
    'countdown_seconds' => (int) env('CARDS_COUNTDOWN_SECONDS', 4),
    'deal_seconds' => (int) env('CARDS_DEAL_SECONDS', 3),

    // Your turn ends after this long: the table draws a card for you
    'turn_seconds' => (int) env('CARDS_TURN_SECONDS', 20),

    // A player who hasn't polled for this long gets their seat taken over by an NPC
    'disconnect_timeout_seconds' => (int) env('CARDS_DISCONNECT_TIMEOUT_SECONDS', 30),

    'hand_size' => 7,

    // Forgot to press "LAATSTE!" and someone else pressed it first
    'last_card_penalty' => 2,

    /*
    | Optional house rules, chosen in the popup by the first player at the
    | table (all off by default). Add a rule here and in
    | App\Games\Cards\CardRules to make it available.
    */
    'house_rules' => [
        'stacking' => [
            'label' => '+2 en +4 stapelen',
            'description' => 'Leg een +2 op een +2 (of een +4 op een +2 of +4): de volgende pakt alles samen.',
        ],
        'zero_seven' => [
            'label' => '0/7-regel',
            'description' => 'Een 0 schuift alle handen door, met een 7 ruil je je hand met een tegenstander.',
        ],
    ],

    'npc' => [
        'difficulties' => ['easy', 'normal', 'hard'],
        'default_difficulty' => 'normal',

        // An NPC "thinks" this long before every move (ms)
        'delay_ms' => [700, 1500],

        // Chance an NPC presses "LAATSTE!" in time, and that it catches someone who forgot
        'calls_last' => ['easy' => 0.55, 'normal' => 0.8, 'hard' => 0.97],
        'catches' => ['easy' => 0.25, 'normal' => 0.5, 'hard' => 0.85],

        // NPCs at the table, each with an outfit in the Hotel avatar style
        'roster' => [
            ['name' => 'Bot1', 'look' => ['skin' => '#F1C7A5', 'hair' => '#A23B2A', 'hairStyle' => 1, 'shirt' => '#FFB627', 'pants' => '#1E3A8A', 'shoes' => '#1F1F2E']],
            ['name' => 'Bot2', 'look' => ['skin' => '#8D5524', 'hair' => '#7C5CFF', 'hairStyle' => 2, 'shirt' => '#FF6B6B', 'pants' => '#0F1E3A', 'shoes' => '#FFFFFF']],
            ['name' => 'Bot3', 'look' => ['skin' => '#FFDBB8', 'hair' => '#E8D27A', 'hairStyle' => 0, 'shirt' => '#14B8A6', 'pants' => '#3B4A68', 'shoes' => '#FFB627']],
            ['name' => 'Bot4', 'look' => ['skin' => '#C68642', 'hair' => '#2B1B10', 'hairStyle' => 1, 'shirt' => '#7C5CFF', 'pants' => '#5B6B8A', 'shoes' => '#C81E1E']],
            ['name' => 'Bot5', 'look' => ['skin' => '#E0AC7E', 'hair' => '#22D3EE', 'hairStyle' => 2, 'shirt' => '#2F6BFF', 'pants' => '#0F766E', 'shoes' => '#FFFFFF']],
            ['name' => 'Bot6', 'look' => ['skin' => '#F1C7A5', 'hair' => '#5A3A1E', 'hairStyle' => 0, 'shirt' => '#0F1E3A', 'pants' => '#7A5230', 'shoes' => '#FFB627']],
        ],
    ],

];
