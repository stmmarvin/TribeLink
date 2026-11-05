<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tribekaarten at the card table in the Hotel: the games (next to
     * chess_games) and the 2–4 players at each, students or NPCs.
     */
    public function up(): void
    {
        Schema::create('card_games', function (Blueprint $table) {
            $table->id();
            $table->string('room_id');
            // Furni id of the card table in the room (resources/js/game/rooms.ts)
            $table->string('table_id');
            // easy | normal: how the NPCs at this table play
            $table->string('npc_difficulty');
            // Keys of config('cards.house_rules') that are on
            $table->json('house_rules');
            // App\Games\Cards\CardRules::toArray(): hands and piles, never sent to the browser as is
            $table->json('state');
            // What happened lately (for the animations), each with an increasing id
            $table->json('events');
            $table->unsignedInteger('event_seq')->default(0);
            // active | finished
            $table->string('status')->default('active');
            // Seat of the winner (null: nobody, e.g. all students left)
            $table->unsignedTinyInteger('winner_seat')->nullable();
            // won | last-standing | abandoned
            $table->string('end_reason')->nullable();
            $table->unsignedInteger('turns')->default(0);
            // Timers in milliseconds (the NPCs think 0.7–1.5 s)
            $table->unsignedBigInteger('turn_ends_at_ms')->nullable();
            $table->unsignedBigInteger('npc_acts_at_ms')->nullable();
            // An NPC presses "LAATSTE!" at this moment (late, or to catch someone)
            $table->unsignedBigInteger('catch_at_ms')->nullable();
            $table->unsignedTinyInteger('catch_by')->nullable();
            // End of the countdown; dealing follows, then the first turn
            $table->timestamp('starts_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'room_id', 'table_id']);
        });

        Schema::create('card_game_players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('card_game_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('seat');
            // Null for an NPC; kept when an NPC takes over the seat, so the result still counts
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            // NPC name and outfit (config('cards.npc.roster'))
            $table->string('npc_name')->nullable();
            $table->json('npc_look')->nullable();
            // playing | npc | taken-over (disconnected) | forfeited | left
            $table->string('status');
            $table->timestamp('seen_at')->nullable();
            // Final standing
            $table->unsignedTinyInteger('cards_left')->nullable();
            $table->boolean('is_winner')->default(false);
            $table->timestamps();

            $table->unique(['card_game_id', 'seat']);
            $table->index(['user_id', 'is_winner']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('card_game_players');
        Schema::dropIfExists('card_games');
    }
};
