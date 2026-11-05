import { router } from "@inertiajs/react";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const smallButton =
    "inline-flex h-7 items-center rounded-full px-2.5 type-caption font-semibold transition-colors focus-ring disabled:opacity-50";

/** Quiet trash icon; asks for confirmation inline before deleting. */
export function DeletePostButton({ postId }: { postId: string }) {
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);

    if (!confirming) {
        return (
            <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-label="Post verwijderen"
                title="Verwijderen"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger-surface hover:text-danger-text focus-ring"
            >
                <Trash2 size={16} aria-hidden="true" />
            </button>
        );
    }

    return (
        <div
            role="group"
            aria-label="Post verwijderen bevestigen"
            className="flex shrink-0 items-center gap-1"
        >
            <span className="mr-1 type-caption text-ink-secondary">
                Verwijderen?
            </span>
            <button
                type="button"
                autoFocus
                disabled={deleting}
                onClick={() => setConfirming(false)}
                className={cn(
                    smallButton,
                    "text-ink-secondary hover:bg-subtle",
                )}
            >
                Nee
            </button>
            <button
                type="button"
                disabled={deleting}
                onClick={() =>
                    router.delete(`/feed/${postId}`, {
                        preserveScroll: true,
                        onStart: () => setDeleting(true),
                        onFinish: () => setDeleting(false),
                    })
                }
                className={cn(
                    smallButton,
                    "bg-danger-surface text-danger-text hover:bg-danger hover:text-white",
                )}
            >
                {deleting ? "Bezig…" : "Ja"}
            </button>
        </div>
    );
}
