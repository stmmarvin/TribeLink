<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Open letters ("Open brief") were removed from TribeLink.
     * Databases that still have the table lose it here.
     */
    public function up(): void
    {
        Schema::dropIfExists('open_letters');
    }

    public function down(): void
    {
        Schema::create('open_letters', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();

            $table->index(['created_at', 'id']);
        });
    }
};
