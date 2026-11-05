<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One waiting queue for every game at a table in the Hotel (chess boards,
     * the Tribekaarten table), replacing the chess-only queue. Queue spots
     * only live while someone polls, so nothing needs to be carried over.
     */
    public function up(): void
    {
        Schema::create('game_queue', function (Blueprint $table) {
            $table->id();
            // One spot per student: joining another table leaves the old one
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            // chess | cards (App\Games\Matchmaking)
            $table->string('game');
            $table->string('room_id');
            // Furni id of the board or table in the room (resources/js/game/rooms.ts)
            $table->string('table_id');
            // Per game: NPC difficulty, house rules, "start now", …
            $table->json('options');
            // Refreshed by every poll; stale entries are never matched
            $table->timestamp('last_seen_at');
            $table->timestamps();

            $table->index(['game', 'room_id', 'table_id']);
        });

        Schema::dropIfExists('chess_queue');
    }

    public function down(): void
    {
        Schema::dropIfExists('game_queue');

        Schema::create('chess_queue', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('room_id');
            $table->string('board_id');
            $table->string('difficulty');
            $table->timestamp('last_seen_at');
            $table->timestamps();

            $table->index(['room_id', 'board_id']);
        });
    }
};
