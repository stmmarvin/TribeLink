import { Link, router, useForm } from "@inertiajs/react";
import { Avatar } from "@/components/tribelink/avatar";
import { Card } from "@/components/tribelink/card";
import { Chip } from "@/components/tribelink/chip";
import { useProfileHref } from "@/hooks/use-profile-href";
import { formatRelative } from "@/lib/format";
import { DeletePostButton } from "@/components/content/delete-post-button";
import { EditPostButton, EditPostForm } from "@/components/content/edit-post";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Post } from "@/types";

/**
 * Figma "Post card" (Feed 4.3, Profiel 4.7, Home 2.1).
 * `preview` is the compact row used in "Recent in de feed" on mobile Home.
 */
export function PostCard({
    post,
    variant = "full",
}: {
    post: Post;
    variant?: "full" | "preview";
}) {
    const { author } = post;
    const profileHref = useProfileHref();
    const commentForm = useForm({ body: "" });
    const when = formatRelative(post.createdAt);
    const comments = `${post.commentCount} ${post.commentCount === 1 ? "reactie" : "reacties"}`;
    const likes = post.likeCount ?? 0;
    const commentsList = post.comments ?? [];
    const [editing, setEditing] = useState(false);

    if (variant === "preview") {
        return (
            <>
                {/* Mobile: compact row */}
                <Card
                    interactive
                    className="flex items-center gap-3 py-1.5 pr-3 md:hidden"
                >
                    <Link
                        href={profileHref(author.id)}
                        className="rounded-full focus-ring"
                        aria-label={`Bekijk profiel van @${author.username}`}
                    >
                        <Avatar
                            name={author.username}
                            src={author.avatarUrl}
                            size={32}
                        />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                        <Link
                            href={profileHref(author.id)}
                            className="truncate rounded-sm font-display text-sm leading-[19.6px] font-bold text-ink focus-ring hover:text-brand-aa"
                        >
                            @{author.username}
                        </Link>
                        <span className="truncate type-caption text-ink-secondary">
                            {post.body}
                        </span>
                    </div>
                </Card>
                <div className="hidden md:block">
                    <PostCard post={post} />
                </div>
            </>
        );
    }

    return (
        <Card interactive className="p-3.5 md:p-4">
            <article className="flex flex-col gap-3">
                <header className="flex items-center gap-2.5">
                    <Link
                        href={profileHref(author.id)}
                        className="rounded-full focus-ring"
                        aria-label={`Bekijk profiel van @${author.username}`}
                    >
                        <Avatar
                            name={author.username}
                            src={author.avatarUrl}
                            size={32}
                            className="md:hidden"
                        />
                        <Avatar
                            name={author.username}
                            src={author.avatarUrl}
                            size={36}
                            className="hidden md:inline-flex"
                        />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[18px]">
                        <Link
                            href={profileHref(author.id)}
                            className="truncate rounded-sm font-display text-base leading-[19.6px] font-bold text-ink focus-ring hover:text-brand-aa md:text-sm md:leading-[18px]"
                        >
                            @{author.username}
                        </Link>
                        <time
                            dateTime={post.createdAt}
                            className="type-caption text-ink-secondary md:leading-[18px] md:text-ink-muted"
                        >
                            <span className="hidden md:inline">Post · </span>
                            {when}
                        </time>
                    </div>
                    {post.isOwn && !editing && (
                        <>
                            <EditPostButton onClick={() => setEditing(true)} />
                            <DeletePostButton postId={post.id} />
                        </>
                    )}
                    <Chip
                        variant="neutral"
                        className="font-body font-normal text-ink md:hidden"
                    >
                        Post
                    </Chip>
                </header>
                {editing && (
                    <EditPostForm
                        postId={post.id}
                        body={post.body}
                        imageUrl={post.imageUrl}
                        onDone={() => setEditing(false)}
                    />
                )}
                {!editing && (
                    <Link
                        href={`/feed/${post.id}`}
                        className="flex flex-col gap-3 rounded-card focus-ring"
                    >
                        <p className="type-small whitespace-pre-line text-ink-secondary">
                            {post.body}
                        </p>
                        {post.imageUrl && (
                            <img
                                src={post.imageUrl}
                                alt=""
                                className="h-[152px] w-full rounded-card object-cover md:h-[180px]"
                            />
                        )}
                    </Link>
                )}

                <p
                    className={cn(
                        "type-caption text-ink-secondary md:leading-[18px] md:text-ink-muted",
                    )}
                >
                    {comments}
                </p>
                <button
                    type="button"
                    aria-pressed={post.likedByViewer ?? false}
                    aria-label={
                        post.likedByViewer ? "Like verwijderen" : "Post liken"
                    }
                    onClick={() =>
                        router.post(
                            `/feed/${post.id}/like`,
                            {},
                            { preserveScroll: true },
                        )
                    }
                    className={cn(
                        "self-start rounded-full px-3 py-1.5 type-caption transition-colors focus-ring",
                        post.likedByViewer
                            ? "bg-danger-surface text-danger-text"
                            : "bg-subtle text-ink-secondary hover:bg-brand/10 hover:text-brand-aa",
                    )}
                >
                    {post.likedByViewer ? "♥" : "♡"} {likes}
                </button>
                {commentsList.length > 0 && (
                    <ul className="flex flex-col gap-2 border-t border-line pt-3">
                        {commentsList.map((comment) => (
                            <li
                                key={comment.id}
                                className="text-sm text-ink-secondary"
                            >
                                <Link
                                    href={profileHref(comment.author.id)}
                                    className="font-semibold text-ink hover:text-brand-aa"
                                >
                                    @{comment.author.username}
                                </Link>{" "}
                                {comment.body}
                            </li>
                        ))}
                    </ul>
                )}
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        commentForm.post(`/feed/${post.id}/comments`, {
                            preserveScroll: true,
                            onSuccess: () => commentForm.reset("body"),
                        });
                    }}
                    className="flex gap-2 border-t border-line pt-3"
                >
                    <input
                        value={commentForm.data.body}
                        maxLength={1000}
                        onChange={(event) =>
                            commentForm.setData("body", event.target.value)
                        }
                        placeholder="Schrijf een reactie…"
                        aria-label={`Reageer op de post van @${author.username}`}
                        className="min-w-0 flex-1 rounded-full border border-line bg-subtle px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                    />
                    <button
                        type="submit"
                        disabled={
                            commentForm.processing ||
                            !commentForm.data.body.trim()
                        }
                        className="rounded-full bg-brand-aa px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                        Plaats
                    </button>
                </form>
            </article>
        </Card>
    );
}
