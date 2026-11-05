import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ArcadeLeaderboards, ArcadeScoreEntry } from "@/types";

const PERIODS: Array<[keyof ArcadeLeaderboards, string]> = [
    ["today", "Vandaag"],
    ["week", "Week"],
    ["allTime", "All-time"],
];

/** Gold, silver, bronze for the top 3. */
const MEDALS = [
    "bg-sunshine text-ink",
    "bg-[#CBD5E1] text-ink",
    "bg-[#D9A066] text-ink",
];

/** Ranked list of best scores; your own row is highlighted. */
export function ScoreList({
    entries,
    myId,
    empty = "Nog geen scores. Wees de eerste!",
}: {
    entries: ArcadeScoreEntry[];
    myId: number;
    empty?: string;
}) {
    if (entries.length === 0) {
        return (
            <p className="py-3 text-center text-caption text-ink-secondary">
                {empty}
            </p>
        );
    }

    return (
        <ol className="flex flex-col gap-1">
            {entries.map((entry) => (
                <li
                    key={entry.userId}
                    className={cn(
                        "flex items-center gap-2 rounded-input border-2 px-2 py-1.5",
                        entry.userId === myId
                            ? "border-blue bg-blue/10"
                            : "border-transparent",
                    )}
                >
                    <span
                        className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-[4px] font-pixel text-[11px]",
                            MEDALS[entry.rank - 1] ??
                                "bg-subtle text-ink-secondary",
                        )}
                    >
                        {entry.rank}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-jakarta text-label text-ink">
                        @{entry.username}
                    </span>
                    <span className="font-pixel text-[13px] text-ink">
                        {entry.score}
                    </span>
                </li>
            ))}
        </ol>
    );
}

/** Leaderboard with Vandaag / Week / All-time tabs. */
export function Leaderboard({
    leaderboards,
    myId,
}: {
    leaderboards: ArcadeLeaderboards;
    myId: number;
}) {
    const [period, setPeriod] = useState<keyof ArcadeLeaderboards>("today");

    return (
        <div className="flex flex-col gap-2">
            <div
                role="tablist"
                aria-label="Periode"
                className="grid grid-cols-3 gap-1"
            >
                {PERIODS.map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={period === key}
                        onClick={() => setPeriod(key)}
                        className={cn(
                            "h-8 rounded-input border-2 font-pixel text-[10px] uppercase transition-colors",
                            period === key
                                ? "border-blue bg-blue/10 text-blue-aa"
                                : "border-line text-ink-secondary hover:bg-subtle",
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <div role="tabpanel" className="max-h-56 overflow-y-auto">
                <ScoreList entries={leaderboards[period]} myId={myId} />
            </div>
        </div>
    );
}
