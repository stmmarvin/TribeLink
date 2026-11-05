<?php

namespace App\Http\Controllers;

use App\Models\LobbyPresence;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function show(Request $request): Response
    {
        $user = $request->user();
        $friendIds = $user->friends()->pluck('users.id');

        return Inertia::render('dashboard', [
            'posts' => $this->postsFor($user, $friendIds),
            'contacts' => $user->friends()
                ->select('users.id', 'users.username', 'users.avatar_path')
                ->get()
                ->map(fn (User $friend): array => [
                    'id' => (string) $friend->id,
                    'username' => $friend->username,
                    'avatarUrl' => $friend->avatar,
                    'status' => 'friend',
                    'subtitle' => null,
                ])
                ->values()
                ->all(),
            'rooms' => LobbyPresence::roomSummaries(),
            'onlineCount' => LobbyPresence::onlineCount(),
        ]);
    }

    private function postsFor(User $user, $friendIds): array
    {
        return Post::query()
            ->with('user:id,username,name,avatar_path')
            ->withCount('likes')
            ->withCount('comments')
            ->where(function ($query) use ($user, $friendIds): void {
                $query
                    ->where('visibility', 'public')
                    ->orWhere(function ($friendsQuery) use ($user, $friendIds): void {
                        $friendsQuery
                            ->where('visibility', 'friends')
                            ->where(function ($audienceQuery) use ($user, $friendIds): void {
                                $audienceQuery
                                    ->where('user_id', $user->id)
                                    ->orWhereIn('user_id', $friendIds);
                            });
                    });
            })
            ->latest()
            ->latest('id')
            ->limit(10)
            ->get()
            ->map(fn (Post $post): array => [
                'id' => (string) $post->id,
                'author' => [
                    'id' => (string) $post->user->id,
                    'username' => $post->user->username,
                    'avatarUrl' => $post->user->avatar,
                ],
                'body' => $post->body,
                'imageUrl' => null,
                'createdAt' => $post->created_at?->toISOString(),
                'commentCount' => (int) $post->comments_count,
                'likeCount' => (int) $post->likes_count,
                'likedByViewer' => $user->likedPosts()->whereKey($post->id)->exists(),
                'visibility' => $post->visibility,
            ])
            ->values()
            ->all();
    }
}
