import type { ReactNode } from "react";
import type { RingsMode } from "./search-rings";
import { SearchRings } from "./search-rings";

/**
 * Centred screen for the non-chat states (start, zoeken, beëindigd), after
 * Figma 2.3. Mobile: content centred, actions pinned to the bottom.
 * Desktop: everything centred inside a white card, actions 240px wide.
 */
export function StatusPanel({
    rings,
    title,
    children,
    actions,
    live = false,
}: {
    rings: RingsMode;
    title: string;
    children?: ReactNode;
    actions: ReactNode;
    /** Announce the title to screen readers when it appears. */
    live?: boolean;
}) {
    return (
        <div className="flex min-h-0 flex-1 flex-col md:items-center md:justify-center md:rounded-card md:border md:border-line md:bg-surface md:p-8 md:shadow-card">
            <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto py-6 text-center md:flex-none md:overflow-visible md:py-0">
                <SearchRings mode={rings} />
                <div
                    className="flex max-w-[350px] flex-col items-center gap-3 md:max-w-md"
                    role={live ? "status" : undefined}
                >
                    <h2 className="font-display text-2xl leading-7 font-bold text-ink md:text-xl md:leading-[26px]">
                        {title}
                    </h2>
                    {children}
                </div>
            </div>
            <div className="flex w-full flex-col items-center gap-2.5 md:mt-4 md:w-60">
                {actions}
            </div>
        </div>
    );
}

/** "38 studenten online" line (Figma 2.3); hidden while the count is unknown. */
export function OnlineCount({ count }: { count: number | null }) {
    if (count === null) {
        return null;
    }

    return (
        <p className="type-caption text-ink-secondary md:type-small">
            {count} {count === 1 ? "student" : "studenten"} online
        </p>
    );
}
