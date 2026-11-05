<?php

namespace App\Support;

use App\Models\Post;
use App\Models\PostComment;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

/**
 * The shape of a post as the frontend's PostCard expects it.
 * Used by the feed and by a user's profile page.
 */
class PostPayload
{
    /**
     * Load `user`, `comments.user` and the likes/comments counts before calling this.
     *
     * @return array<string, mixed>
     */
    public static function make(Post $post, User $viewer): array
    {
        return [
            'id' => (string) $post->id,
            'author' => [
                'id' => (string) $post->user->id,
                'username' => $post->user->username,
                'avatarUrl' => $post->user->avatar,
            ],
            'body' => $post->body,
            'imageUrl' => $post->image_path ? Storage::url($post->image_path) : null,
            'createdAt' => $post->created_at?->toISOString(),
            'commentCount' => (int) $post->comments_count,
            'likeCount' => (int) $post->likes_count,
            'likedByViewer' => $viewer->likedPosts()->whereKey($post->id)->exists(),
            'visibility' => $post->visibility,
            // Tells the frontend where to show the edit and delete buttons
            'isOwn' => $post->user_id === $viewer->id,
            'comments' => $post->comments
                ->sortBy('created_at')
                ->take(10)
                ->map(fn (PostComment $comment): array => [
                    'id' => (string) $comment->id,
                    'author' => [
                        'id' => (string) $comment->user->id,
                        'username' => $comment->user->username,
                        'avatarUrl' => $comment->user->avatar,
                    ],
                    'body' => $comment->body,
                    'createdAt' => $comment->created_at?->toISOString(),
                ])->values()->all(),
        ];
    }
}
