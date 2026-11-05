<?php

namespace App\Http\Controllers;

use App\Models\Friendship;
use App\Models\Post;
use App\Models\User;
use App\Support\PostPayload;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicProfileController extends Controller
{
    /**
     * Display the public profile poster for a user.
     */
    public function show(Request $request, User $user): Response
    {
        $profileUrl = route('profile.public', ['user' => $user], true);
        $viewer = $request->user();

        $qrCodeSvg = (new Writer(new ImageRenderer(
            new RendererStyle(400),
            new SvgImageBackEnd
        )))->writeString($profileUrl);

        return Inertia::render('public-profile', [
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'name' => $user->name,
                'bio' => $user->bio,
                'avatar' => $user->avatar,
                'email' => $viewer?->is($user) ? $user->email : null,
                'poster_message' => $user->poster_message,
            ],
            'viewer' => [
                'authenticated' => $viewer !== null,
                'is_self' => $viewer?->is($user) ?? false,
                'is_friend' => $viewer?->friends()->whereKey($user->id)->exists() ?? false,
                // Open friend request from the viewer to this user (waiting for them)
                'friend_request_sent' => $viewer !== null && Friendship::where('user_id', $viewer->id)
                    ->where('friend_id', $user->id)
                    ->whereNull('accepted_at')
                    ->exists(),
                // Open friend request from this user to the viewer (the viewer can accept)
                'friend_request_received' => $viewer !== null && Friendship::where('user_id', $user->id)
                    ->where('friend_id', $viewer->id)
                    ->whereNull('accepted_at')
                    ->exists(),
            ],
            'profile_url' => $profileUrl,
            'qr_code_svg' => $qrCodeSvg,
            'posts' => $this->postsFor($user, $viewer),
        ]);
    }

    /**
     * Posts on this profile. You and your friends see all posts,
     * other logged-in users only the public ones, guests none.
     *
     * @return array<int, array<string, mixed>>
     */
    private function postsFor(User $user, ?User $viewer): array
    {
        if ($viewer === null) {
            return [];
        }

        $seesAll = $viewer->is($user) || $viewer->isFriendsWith($user);

        return $user->posts()
            ->with(['user:id,username,name,avatar_path', 'comments.user:id,username,avatar_path'])
            ->withCount(['likes', 'comments'])
            ->when(! $seesAll, fn ($query) => $query->where('visibility', 'public'))
            ->latest()
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(fn (Post $post): array => PostPayload::make($post, $viewer))
            ->all();
    }
}
