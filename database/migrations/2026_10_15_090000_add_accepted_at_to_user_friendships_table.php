<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Friend requests: a row without `accepted_at` is an open request.
     */
    public function up(): void
    {
        Schema::table('user_friendships', function (Blueprint $table) {
            $table->timestamp('accepted_at')->nullable()->after('friend_id');
        });

        // Friendships that already existed were added directly, so they count as accepted
        DB::table('user_friendships')->update(['accepted_at' => DB::raw('COALESCE(created_at, CURRENT_TIMESTAMP)')]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_friendships', function (Blueprint $table) {
            $table->dropColumn('accepted_at');
        });
    }
};
