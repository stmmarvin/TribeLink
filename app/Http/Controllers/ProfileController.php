<?php

namespace App\Http\Controllers;

use App\Models\Friendship;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function show(Request $request): Response
    {
        $user = $request->user();
        $friends = $user->friends()->select('users.id', 'users.username', 'users.avatar_path')->get();

        $posts = Post::query()
            ->where('user_id', $user->id)
            ->with('user:id,username,name,avatar_path')
            ->withCount('likes')
            ->withCount('comments')
            ->latest()
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(fn (Post $post): array => [
                'id' => (string) $post->id,
                'author' => [
                    'id' => (string) $post->user->id,
                    'username' => $post->user->username,
                    'avatarUrl' => $post->user->avatar,
                    'isOwn' => true,
                ],
                'body' => $post->body,
                'imageUrl' => $post->image_path ? Storage::url($post->image_path) : null,
                'createdAt' => $post->created_at?->toISOString(),
                'commentCount' => (int) $post->comments_count,
                'likeCount' => (int) $post->likes_count,
                'likedByViewer' => $user->likedPosts()->whereKey($post->id)->exists(),
                'visibility' => $post->visibility,
            ]);

        $contacts = $friends->map(fn ($friend): array => [
            'id' => (string) $friend->id,
            'username' => $friend->username,
            'avatarUrl' => $friend->avatar,
            'status' => 'friend',
            'subtitle' => null,
        ])->values()->all();

        // People who sent the user a friend request that is not accepted yet.
        // Accept with PATCH /friends/{id}, decline with DELETE /friends/{id}.
        $friendRequests = $user->incomingFriendRequests()
            ->with('requester:id,username,avatar_path')
            ->latest()
            ->get()
            ->map(fn (Friendship $friendRequest): array => [
                'id' => (string) $friendRequest->requester->id,
                'username' => $friendRequest->requester->username,
                'avatarUrl' => $friendRequest->requester->avatar,
            ])->values()->all();

        return Inertia::render('profile/show', [
            'bio' => $user->bio,
            'bannerUrl' => $user->banner,
            'posts' => $posts->values()->all(),
            'contacts' => $contacts,
            'friendRequests' => $friendRequests,
        ]);
    }
}
