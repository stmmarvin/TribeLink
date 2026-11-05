<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lobby_presences', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('room_id', 64);
            $table->string('game_proposal', 120)->nullable();
            $table->timestamp('last_seen_at');
            $table->timestamps();

            $table->unique('user_id');
            $table->index(['room_id', 'last_seen_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lobby_presences');
    }
};
