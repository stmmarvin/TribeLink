import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Small pixel popup in the Hotel after clicking a game table (chess board,
 * card table): title bar with a close button, the game's own content below.
 */
export function GamePopup({
    title,
    onClose,
    className,
    children,
}: {
    title: string;
    onClose: () => void;
    className?: string;
    children: ReactNode;
}) {
    return (
        <section
            aria-label={title}
            className={cn(
                "absolute top-1/2 left-1/2 z-40 max-h-[calc(100%-24px)] w-[min(calc(100%-24px),320px)] -translate-x-1/2 -translate-y-1/2 [animation:fade-in-soft_180ms_ease-out_both] overflow-y-auto rounded-card border-4 border-ink bg-surface shadow-[6px_6px_0_0_rgb(15_30_58/0.85)]",
                className,
            )}
        >
            <header className="sticky top-0 z-10 flex items-center justify-between bg-brand px-4 py-2.5">
                <h2 className="font-pixel text-[13px] tracking-wide text-white uppercase">
                    {title}
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Sluiten"
                    className="flex size-7 items-center justify-center rounded-pill text-white hover:bg-white/20"
                >
                    ✕
                </button>
            </header>

            <div className="flex flex-col gap-3 p-4">{children}</div>
        </section>
    );
}
