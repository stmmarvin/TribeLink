<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\User;
use App\Support\PostPayload;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class FeedController extends Controller
{
    // Posts of the user and their friends, newest first
    public function index(Request $request): Response
    {
        $user = $request->user();
        $friendIds = $user->friendIds();

        $posts = $this->visiblePosts($user, $friendIds)
            ->latest()
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(fn (Post $post): array => $this->payload($post, $user))
            ->values()
            ->all();

        return Inertia::render('feed/index', [
            'posts' => $posts,
            'contacts' => [],
        ]);
    }

    // One post with all its comments (Figma 4.4)
    public function show(Request $request, Post $post): Response
    {
        abort_unless($this->canView($request->user(), $post), 403);

        $post->load(['user:id,username,name,avatar_path', 'comments.user:id,username,avatar_path'])
            ->loadCount(['likes', 'comments']);

        return Inertia::render('feed/show', [
            'post' => $this->payload($post, $request->user()),
        ]);
    }

    // Save a new post written by the logged-in user
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate($this->rules());

        $path = $request->file('image')?->store('posts', 'public');

        $request->user()->posts()->create([
            'body' => trim($validated['body']),
            'visibility' => $validated['visibility'],
            'image_path' => $path,
        ]);

        return to_route('feed')->with('success', 'Je bericht staat in de feed.');
    }

    // Change the text of your own post
    public function update(Request $request, Post $post): RedirectResponse
    {
        abort_unless($post->user_id === Auth::id(), 403);

        $validated = $request->validate([
            'body' => $this->rules()['body'],
            'visibility' => ['sometimes', 'in:public,friends'],
            'image' => $this->rules()['image'],
            'remove_image' => ['sometimes', 'boolean'],
        ]);

        $imagePath = $post->image_path;

        // New photo or photo removed: delete the old file
        if ($request->hasFile('image') || $request->boolean('remove_image')) {
            if ($imagePath) {
                Storage::disk('public')->delete($imagePath);
            }
            $imagePath = $request->file('image')?->store('posts', 'public');
        }

        $post->update([
            'body' => trim($validated['body']),
            // Keep the current visibility unless a new one is sent
            'visibility' => $validated['visibility'] ?? $post->visibility,
            'image_path' => $imagePath,
        ]);

        // Stay on the page you edited from (feed or detail page)
        return back()->with('success', 'Je post is aangepast.');
    }

    // Delete your own post, including its image
    public function destroy(Post $post): RedirectResponse
    {
        abort_unless($post->user_id === Auth::id(), 403);

        // Coming from the detail page? That page no longer exists afterwards
        $fromDetail = url()->previous() === route('feed.show', $post);

        if ($post->image_path) {
            Storage::disk('public')->delete($post->image_path);
        }

        $post->delete();

        return $fromDetail
            ? to_route('feed')->with('success', 'Je post is verwijderd.')
            : back()->with('success', 'Je post is verwijderd.');
    }

    public function toggleLike(Request $request, Post $post): RedirectResponse
    {
        abort_unless($this->canView($request->user(), $post), 403);

        $relation = $request->user()->likedPosts();
        $liked = $relation->whereKey($post->id)->exists();

        if ($liked) {
            $relation->detach($post->id);
        } else {
            $relation->attach($post->id);
        }

        return back();
    }

    public function comment(Request $request, Post $post): RedirectResponse
    {
        abort_unless($this->canView($request->user(), $post), 403);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:1000', 'regex:/\S/'],
        ]);

        $post->comments()->create([
            'user_id' => $request->user()->id,
            'body' => trim($validated['body']),
        ]);

        return back();
    }

    /**
     * Validation rules for creating and updating a post.
     *
     * @return array<string, array<int, string>>
     */
    private function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:3000', 'regex:/\S/'],
            'visibility' => ['required', 'in:public,friends'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:20480'], // KB = 20 MB
        ];

    }

    /**
     * Your own posts, those of your friends, and public posts of everyone.
     *
     * @param  Collection<int, mixed>  $friendIds
     * @return Builder<Post>
     */
    private function visiblePosts(User $user, Collection $friendIds): Builder
    {
        return Post::query()
            ->with('user:id,username,name,avatar_path')
            ->with('comments.user:id,username,avatar_path')
            ->withCount('likes')
            ->withCount('comments')
            ->where(fn (Builder $query) => $query
                ->whereIn('user_id', $friendIds->concat([$user->id]))
                ->orWhere('visibility', 'public'));
    }

    private function canView(User $user, Post $post): bool
    {
        return $post->user_id === $user->id
            || $post->visibility === 'public'
            || $user->friends()->whereKey($post->user_id)->exists();
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Post $post, User $user): array
    {
        return PostPayload::make($post, $user);
    }
}
