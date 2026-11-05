import { useEffect, useState } from "react";
import type { ArcadeCabinet } from "@/lib/arcade";
import { getJson } from "@/lib/http";
import { scores } from "@/routes/arcade";
import type { ArcadeScores } from "@/types";
import { ScoreList } from "./leaderboard";
import { ArcadeLogo } from "./logos";

/**
 * Pixel popup at a cabinet in the Arcade: "Spelen", your highscore and
 * today's top 3 for that game.
 */
export function ArcadePopup({
    cabinet,
    myId,
    onPlay,
    onClose,
}: {
    cabinet: ArcadeCabinet;
    myId: number;
    onPlay: () => void;
    onClose: () => void;
}) {
    const [data, setData] = useState<ArcadeScores | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getJson<ArcadeScores>(scores.url(cabinet.game))
            .then((result) => !cancelled && setData(result))
            .catch(() => !cancelled && setError(true));

        return () => {
            cancelled = true;
        };
    }, [cabinet.game]);

    return (
        <section
            aria-label={`${cabinet.title} spelen`}
            className="absolute top-1/2 left-1/2 z-40 w-[min(calc(100%-24px),320px)] -translate-x-1/2 -translate-y-1/2 [animation:fade-in-soft_180ms_ease-out_both] overflow-hidden rounded-card border-4 border-ink bg-surface shadow-[6px_6px_0_0_rgb(15_30_58/0.85)]"
        >
            <header className="flex items-center justify-between bg-brand px-4 py-2.5">
                <h2 className="font-pixel text-[13px] tracking-wide text-white uppercase">
                    {cabinet.title}
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

            <div className="flex flex-col gap-3 p-4">
                <ArcadeLogo game={cabinet.game} className="py-1" />
                <p className="text-center text-caption text-ink-secondary">
                    {cabinet.description}
                </p>

                <div className="flex items-center justify-between rounded-input border-2 border-line px-3 py-2">
                    <span className="font-pixel text-[11px] text-ink-secondary uppercase">
                        Jouw highscore
                    </span>
                    <span className="font-pixel text-[16px] text-ink">
                        {data ? data.personalBest : "–"}
                    </span>
                </div>

                <div>
                    <h3 className="mb-1.5 font-pixel text-[11px] text-ink-secondary uppercase">
                        Top 3 vandaag
                    </h3>
                    {data ? (
                        <ScoreList
                            entries={data.leaderboards.today.slice(0, 3)}
                            myId={myId}
                        />
                    ) : (
                        <p
                            role={error ? "alert" : "status"}
                            className="py-3 text-center text-caption text-ink-secondary"
                        >
                            {error
                                ? "Scores laden lukte niet."
                                : "Scores laden…"}
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onPlay}
                    className="h-10 rounded-pill bg-brand-aa font-pixel text-[12px] text-white uppercase transition-colors hover:bg-brand"
                >
                    Spelen
                </button>
            </div>
        </section>
    );
}
