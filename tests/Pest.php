<?php

use App\Models\Friendship;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| Every feature test runs against a fresh database, and pages render without
| the Vite manifest (so the tests don't need `npm run build` or `npm run dev`).
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->beforeEach(fn () => $this->withoutVite())
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/** An accepted friendship: a row in both directions. */
function befriend(User $a, User $b): void
{
    Friendship::create(['user_id' => $a->id, 'friend_id' => $b->id, 'accepted_at' => now()]);
    Friendship::create(['user_id' => $b->id, 'friend_id' => $a->id, 'accepted_at' => now()]);
}
