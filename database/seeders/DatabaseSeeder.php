<?php

namespace Database\Seeders;

use App\Models\Chat;
use App\Models\Message;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Maak gebruiker A aan
        $userA = User::firstOrCreate(
            ['email' => 'john.doe@student.hu.nl'],
            [
                'username' => 'john_doe',
                'name' => 'John Doe',
                'password' => Hash::make('Password123!'),
                'email_verified_at' => now(),
            ]
        );

        // 2. Maak gebruiker B aan
        $userB = User::firstOrCreate(
            ['email' => 'lisa.jansen@student.hu.nl'],
            [
                'username' => 'lisa_jansen',
                'name' => 'Lisa Jansen',
                'password' => Hash::make('Password123!'),
                'email_verified_at' => now(),
            ]
        );

        // 3. Maak een actieve chat aan tussen beide accounts
        $chat = Chat::create();
        $chat->users()->attach([$userA->id, $userB->id]);

        // 4. Voeg startberichten toe
        Message::create([
            'chat_id' => $chat->id,
            'user_id' => $userB->id,
            'body' => 'Hoi John, werkt de chat bij jou?',
            'created_at' => now()->subMinutes(5),
        ]);

        Message::create([
            'chat_id' => $chat->id,
            'user_id' => $userA->id,
            'body' => 'Ja Lisa, de koppeling werkt nu goed.',
            'created_at' => now()->subMinutes(2),
        ]);

        // 5. Posts, visible in each other's feed once they are friends
        Post::firstOrCreate(
            ['user_id' => $userA->id, 'body' => 'Wie gaat er donderdag mee naar de ICT-borrel?'],
        );

        Post::firstOrCreate(
            ['user_id' => $userB->id, 'body' => 'Eerste week Open-ICT zit erop!'],
        );

    }
}
