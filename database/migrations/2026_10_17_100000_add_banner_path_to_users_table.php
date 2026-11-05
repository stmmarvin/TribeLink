<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Profile banner behind the profile photo, stored on the public disk.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('banner_path')->nullable()->after('avatar_path');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('banner_path');
        });
    }
};
