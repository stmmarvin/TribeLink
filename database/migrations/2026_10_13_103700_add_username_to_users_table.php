<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('username', 32)->nullable()->after('id');
        });

        $used = [];

        DB::table('users')->orderBy('id')->each(function (object $user) use (&$used): void {
            $base = Str::of((string) $user->name)
                ->lower()
                ->replaceMatches('/[^a-z0-9_]+/', '_')
                ->trim('_')
                ->substr(0, 25)
                ->toString();
            $base = $base !== '' ? $base : 'user';
            $username = $base;
            $suffix = 1;

            while (isset($used[$username])) {
                $username = substr($base, 0, 32 - strlen((string) $suffix) - 1)
                    .'_'.$suffix;
                $suffix++;
            }

            $used[$username] = true;
            DB::table('users')->where('id', $user->id)->update(['username' => $username]);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->unique('username');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['username']);
            $table->dropColumn('username');
        });
    }
};
