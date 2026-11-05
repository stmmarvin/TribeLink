import { useEffect, useRef, useState } from "react";
import { Button, Spinner } from "@/components/tribelink/button";
import type { ArcadeLeaderboards } from "@/types";
import { Leaderboard } from "./leaderboard";

const ARM_MS = 700;

/**
 * After an arcade game: score, highscore (with a "Nieuwe highscore!" stamp),
 * the leaderboards and "Opnieuw" / "Terug naar arcade".
 */
export function GameOver({
    score,
    details,
    personalBest,
    isHighscore,
    leaderboards,
    myId,
    saving,
    error,
    onAgain,
    onBack,
}: {
    score: number;
    /** What the score is made of, under the score ("18 blokken · 13 perfect"). */
    details: string;
    personalBest: number;
    isHighscore: boolean;
    leaderboards: ArcadeLeaderboards;
    myId: number;
    /** The score is still being saved. */
    saving: boolean;
    error: string | null;
    onAgain: () => void;
    onBack: () => void;
}) {
    // Someone still tapping or pressing space right after losing shouldn't
    // start a new game by accident: the buttons only work after a moment
    const [armed, setArmed] = useState(false);
    const againRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => setArmed(true), ARM_MS);

        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (armed) againRef.current?.focus();
    }, [armed]);

    return (
        <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-ink/60 p-4">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="arcade-result"
                className="my-auto w-full max-w-sm [animation:fade-in-soft_250ms_ease-out_both] overflow-hidden rounded-card border-4 border-ink bg-surface shadow-[6px_6px_0_0_rgb(15_30_58)]"
            >
                <header className="bg-brand px-4 py-2.5">
                    <h2 className="font-pixel text-[13px] tracking-wide text-white uppercase">
                        Game over
                    </h2>
                </header>
                <div className="relative flex flex-col items-center gap-1 px-5 pt-5 pb-1 text-center">
                    {isHighscore && (
                        <p className="animate-highscore font-pixel text-[13px] text-coral uppercase">
                            Nieuwe highscore!
                        </p>
                    )}
                    <p
                        id="arcade-result"
                        className="font-pixel text-[56px] leading-none text-ink [text-shadow:4px_4px_0_#22d3ee]"
                    >
                        {score}
                    </p>
                    <p className="text-small text-ink-secondary">{details}</p>
                    <p className="mt-1 font-pixel text-[11px] text-ink-secondary uppercase">
                        Highscore {personalBest}
                    </p>
                    {saving && (
                        <p
                            role="status"
                            className="flex items-center gap-2 text-caption text-ink-secondary"
                        >
                            <Spinner /> Score opslaan…
                        </p>
                    )}
                    {error && (
                        <p role="alert" className="text-caption text-[#B42318]">
                            {error}
                        </p>
                    )}
                </div>
                <div className="px-5 pt-3">
                    <Leaderboard leaderboards={leaderboards} myId={myId} />
                </div>
                <div className="flex flex-col gap-2 p-5">
                    <Button
                        ref={againRef}
                        size="md"
                        fullWidth
                        onClick={onAgain}
                        disabled={!armed}
                    >
                        Opnieuw
                    </Button>
                    <Button
                        variant="secondary"
                        size="md"
                        fullWidth
                        onClick={onBack}
                        disabled={!armed}
                    >
                        Terug naar arcade
                    </Button>
                </div>
            </section>
        </div>
    );
}
