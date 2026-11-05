<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Arcade cabinets in the Hotel: one row per run. A run is created when the
     * game starts and gets its score when it ends; only finished runs count
     * for the leaderboards.
     */
    public function up(): void
    {
        Schema::create('arcade_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Key in config/arcade.php → games (stack, …)
            $table->string('game', 32);
            $table->unsignedInteger('score')->nullable();
            // What the score is made of, per game (Stack: blocks/perfects, Wave Rush: distance/coins/…)
            $table->json('stats')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->index(['game', 'finished_at']);
            $table->index(['user_id', 'game']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('arcade_scores');
    }
};
