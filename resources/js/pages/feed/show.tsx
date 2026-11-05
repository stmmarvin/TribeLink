import { Head, Link, useForm } from "@inertiajs/react";
import type { FormEvent } from "react";
import { Avatar } from "@/components/tribelink/avatar";
import { Button } from "@/components/tribelink/button";
import { Card } from "@/components/tribelink/card";
import { inputClasses } from "@/components/tribelink/input";
import { PageHeader } from "@/layouts/app-layout";
import { useProfileHref } from "@/hooks/use-profile-href";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Post } from "@/types";
import { DeletePostButton } from "@/components/content/delete-post-button";
import { EditPostButton, EditPostForm } from "@/components/content/edit-post";
import { useState } from "react";

export default function FeedShow({ post }: { post: Post }) {
    const comments = post.comments ?? [];
    const profileHref = useProfileHref();
    const commentForm = useForm({ body: "" });
    const [editing, setEditing] = useState(false);

    function submit(event: FormEvent) {
        event.preventDefault();
        commentForm.post(`/feed/${post.id}/comments`, {
            preserveScroll: true,
            onSuccess: () => commentForm.reset("body"),
        });
    }

    return (
        <>
            <Head title="Post" />
            <PageHeader title="Post" backHref="/feed" />

            <div className="flex flex-1 flex-col gap-6 px-5 pt-1 pb-24 md:px-10 md:py-8 lg:flex-row lg:items-stretch lg:pb-8 xl:px-[72px]">
                {/* Links: de post */}
                <Card className="self-start p-4 lg:max-w-[456px] lg:flex-1">
                    <article className="flex flex-col gap-3">
                        <header className="flex items-center gap-2.5">
                            <Avatar
                                name={post.author.username}
                                src={post.author.avatarUrl}
                                size={28}
                            />
                            <div className="flex min-w-0 flex-col leading-[16px]">
                                <Link
                                    href={profileHref(post.author.id)}
                                    className="truncate font-display text-sm font-bold text-ink hover:text-brand-aa"
                                >
                                    @{post.author.username}
                                </Link>
                                <time
                                    dateTime={post.createdAt}
                                    className="type-caption text-ink-muted"
                                >
                                    {post.visibility === "friends"
                                        ? "Alleen vrienden"
                                        : "Post"}{" "}
                                    · {formatRelative(post.createdAt)}
                                </time>
                            </div>
                            {post.isOwn && !editing && (
                                <div className="ml-auto flex items-center">
                                    <EditPostButton
                                        onClick={() => setEditing(true)}
                                    />
                                    <DeletePostButton postId={post.id} />
                                </div>
                            )}
                        </header>

                        {editing ? (
                            <EditPostForm
                                postId={post.id}
                                body={post.body}
                                imageUrl={post.imageUrl}
                                onDone={() => setEditing(false)}
                            />
                        ) : (
                            <p className="type-small break-words whitespace-pre-line text-ink-secondary">
                                {post.body}
                            </p>
                        )}

                        {post.imageUrl && !editing && (
                            <img
                                src={post.imageUrl}
                                alt={`Afbeelding bij de post van @${post.author.username}`}
                                className="aspect-[2/1] w-full rounded-card object-cover"
                            />
                        )}

                        <p className="type-caption text-ink-muted">
                            {post.commentCount}{" "}
                            {post.commentCount === 1 ? "reactie" : "reacties"}
                        </p>
                    </article>
                </Card>

                {/* Rechts: reacties */}
                <aside
                    aria-label="Reacties"
                    className="lg:w-[240px] lg:shrink-0"
                >
                    <Card className="flex h-full min-h-[420px] flex-col gap-3 p-4">
                        <h2 className="font-display text-sm fond-bold text-ink">
                            Reacties ({post.commentCount})
                        </h2>

                        {comments.length === 0 ? (
                            <p className="type-small text-ink-muted">
                                Nog geen reacties.
                            </p>
                        ) : (
                            <ul className="flex flex-1 flex-col gap-3 overflow-y-auto">
                                {comments.map((comment) => (
                                    <li
                                        key={comment.id}
                                        className="flex items-start gap-2"
                                    >
                                        <Avatar
                                            name={comment.author.username}
                                            src={comment.author.avatarUrl}
                                            size={22}
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-semibold text-ink">
                                                @{comment.author.username}
                                            </p>
                                            <p className="type-caption break-words text-ink-secondary">
                                                {comment.body}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <form onSubmit={submit} className="mt-auto flex gap-2">
                            <label htmlFor="comment" className="sr-only">
                                Schrijf een reactie
                            </label>
                            <input
                                id="comment"
                                value={commentForm.data.body}
                                maxLength={1000}
                                onChange={(e) =>
                                    commentForm.setData("body", e.target.value)
                                }
                                placeholder="Schrijf een reactie… Voorbeeld: Wat een leuk beesie!"
                                className={cn(
                                    inputClasses,
                                    "min-w-0 flex-1 md:h-10",
                                )}
                            />
                            <Button
                                type="submit"
                                size="sm"
                                className="rounded-field"
                                disabled={
                                    commentForm.processing ||
                                    !commentForm.data.body.trim()
                                }
                            >
                                Stuur
                            </Button>
                        </form>
                    </Card>
                </aside>
            </div>
        </>
    );
}
