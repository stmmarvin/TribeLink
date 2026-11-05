<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Multiplayer Hotel: where each avatar stands and what it does, so everyone
     * in the same room sees each other, plus the room chat.
     */
    public function up(): void
    {
        Schema::table('lobby_presences', function (Blueprint $table): void {
            $table->unsignedSmallInteger('x')->nullable();
            $table->unsignedSmallInteger('y')->nullable();
            $table->unsignedTinyInteger('dir')->default(2);
            $table->json('look')->nullable();
            $table->boolean('sitting')->default(false);
            $table->boolean('dancing')->default(false);
            $table->boolean('typing')->default(false);
            // Increases with every wave, so others can replay it once
            $table->unsignedInteger('waves')->default(0);
        });

        Schema::create('lobby_messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('room_id', 64);
            $table->string('body', 100);
            $table->timestamps();

            $table->index(['room_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lobby_messages');

        Schema::table('lobby_presences', function (Blueprint $table): void {
            $table->dropColumn(['x', 'y', 'dir', 'look', 'sitting', 'dancing', 'typing', 'waves']);
        });
    }
};
