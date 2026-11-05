<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The outfit of your avatar in the Hotel. Null until you've made one
     * (new accounts make it right after verifying their email).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->json('hotel_look')->nullable()->after('banner_path');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('hotel_look');
        });
    }
};
