<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The Agenda (events and who attends them) was removed from TribeLink.
     * Databases that still have its tables lose them here.
     */
    public function up(): void
    {
        Schema::dropIfExists('event_attendees');
        Schema::dropIfExists('events');
    }

    public function down(): void
    {
        Schema::create('events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title', 120);
            $table->dateTime('starts_at');
            $table->string('location', 160);
            $table->string('visibility', 20)->default('public');
            $table->timestamps();

            $table->index(['starts_at', 'visibility']);
        });

        Schema::create('event_attendees', function (Blueprint $table): void {
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->primary(['event_id', 'user_id']);
        });
    }
};
