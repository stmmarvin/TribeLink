<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lobby_invites', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('inviter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('invitee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('used_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('room_id', 64);
            $table->string('token', 64)->unique();
            $table->timestamp('used_at')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index(['room_id', 'expires_at']);
            $table->index(['invitee_id', 'used_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lobby_invites');
    }
};
