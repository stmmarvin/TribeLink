<?php

namespace App\Http\Controllers;

use App\Models\Friendship;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class FriendshipController extends Controller
{
    // Send a friend request (the "Als vriend toevoegen" button)
    public function store(User $user): RedirectResponse
    {
        $me = Auth::user();

        abort_if($user->id === $me->id, 404);

        $friendship = Friendship::between($me, $user)->first();

        if (! $friendship) {
            Friendship::create([
                'user_id' => $me->id,
                'friend_id' => $user->id,
            ]);

            return $this->toast('success', 'Vriendschapsverzoek verstuurd.');
        }

        if ($friendship->accepted_at) {
            return $this->toast('info', 'Jullie zijn al vrienden.');
        }

        if ($friendship->friend_id === $me->id) {
            // The other person already asked me: accept instead of a second request
            $this->acceptRequest($friendship);

            return $this->toast('success', 'Jullie zijn nu vrienden.');
        }

        return $this->toast('info', 'Je hebt al een vriendschapsverzoek gestuurd.');
    }

    // Accept the open request that {user} sent to me
    public function accept(User $user): RedirectResponse
    {
        $friendship = Friendship::where('user_id', $user->id)
            ->where('friend_id', Auth::id())
            ->whereNull('accepted_at')
            ->firstOrFail();

        $this->acceptRequest($friendship);

        return $this->toast('success', 'Jullie zijn nu vrienden.');
    }

    // Decline a request, cancel my own request or unfriend
    public function destroy(User $user): RedirectResponse
    {
        $friendships = Friendship::between(Auth::user(), $user);

        abort_unless($friendships->exists(), 404);

        $wasFriend = $friendships->clone()->whereNotNull('accepted_at')->exists();

        $friendships->delete();

        return $this->toast('success', $wasFriend ? 'Vriend verwijderd.' : 'Vriendschapsverzoek verwijderd.');
    }

    // Mark the request as accepted and add the row in the other direction
    private function acceptRequest(Friendship $friendship): void
    {
        $friendship->update(['accepted_at' => now()]);

        Friendship::updateOrCreate(
            ['user_id' => $friendship->friend_id, 'friend_id' => $friendship->user_id],
            ['accepted_at' => now()],
        );
    }

    // Go back and show a toast (see resources/js/hooks/use-flash-toast.ts)
    private function toast(string $type, string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => $type, 'message' => $message]);

        return back();
    }
}
