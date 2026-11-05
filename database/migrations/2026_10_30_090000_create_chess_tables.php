<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Chess in the Hotel: a waiting queue per chess board, and the games
     * between two students (or a student and the NPC).
     */
    public function up(): void
    {
        Schema::create('chess_queue', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('room_id');
            // Furni id of the chess board in the room (resources/js/game/rooms.ts)
            $table->string('board_id');
            // easy | normal | hard: used when nobody joins and the NPC plays
            $table->string('difficulty');
            // Refreshed by every poll; stale entries are never matched
            $table->timestamp('last_seen_at');
            $table->timestamps();

            $table->index(['room_id', 'board_id']);
        });

        Schema::create('chess_games', function (Blueprint $table) {
            $table->id();
            $table->string('room_id');
            $table->string('board_id');
            // A null side is played by the NPC
            $table->foreignId('white_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->foreignId('black_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('npc_difficulty')->nullable();
            $table->string('fen');
            // Moves in UCI notation (e2e4, e7e8q), replayed to rebuild the game
            $table->json('moves');
            $table->text('pgn');
            // active | finished
            $table->string('status')->default('active');
            // 1-0 | 0-1 | 1/2-1/2
            $table->string('result')->nullable();
            // white | black (null: draw or still playing)
            $table->string('winner')->nullable();
            // checkmate | stalemate | insufficient-material | threefold-repetition | fifty-moves | resign | left | timeout
            $table->string('end_reason')->nullable();
            $table->timestamp('white_seen_at')->nullable();
            $table->timestamp('black_seen_at')->nullable();
            $table->timestamp('starts_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chess_games');
        Schema::dropIfExists('chess_queue');
    }
};
