<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Random chat: a waiting queue, the anonymous chats between two matched
     * students, their messages and reports.
     */
    public function up(): void
    {
        Schema::create('random_chat_queue', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            // Refreshed by every poll; stale entries are never matched
            $table->timestamp('last_seen_at');
            $table->timestamps();
        });

        Schema::create('random_chats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_one_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('user_two_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('user_one_seen_at')->nullable();
            $table->timestamp('user_two_seen_at')->nullable();
            $table->boolean('user_one_saved')->default(false);
            $table->boolean('user_two_saved')->default(false);
            $table->timestamp('ended_at')->nullable();
            $table->foreignId('ended_by')->nullable()->constrained('users')->nullOnDelete();
            // left | reported | timeout
            $table->string('end_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('random_chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('random_chat_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();
        });

        Schema::create('random_chat_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('random_chat_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reported_id')->constrained('users')->cascadeOnDelete();
            $table->string('reason');
            $table->text('details')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('random_chat_reports');
        Schema::dropIfExists('random_chat_messages');
        Schema::dropIfExists('random_chats');
        Schema::dropIfExists('random_chat_queue');
    }
};
