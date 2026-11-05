import { useRef, useState } from "react";
import { postJson } from "@/lib/http";
import { finish, start } from "@/routes/arcade";
import type { ArcadeLeaderboards, ArcadeRunResult } from "@/types";

export type ArcadeSaveState = {
    saving: boolean;
    isHighscore: boolean;
    error: string | null;
};

const IDLE: ArcadeSaveState = {
    saving: false,
    isHighscore: false,
    error: null,
};
const FAILED = "Je score kon niet worden opgeslagen.";

/**
 * One arcade run on the server (ArcadeController): `begin` when the countdown
 * starts, `save` with the score and stats when the game is over. Keeps your
 * highscore and the leaderboards up to date with what the server returns.
 */
export function useArcadeRun(
    game: string,
    initialBest: number,
    initialLeaderboards: ArcadeLeaderboards,
) {
    const runRef = useRef<Promise<number | null>>(Promise.resolve(null));
    const [best, setBest] = useState(initialBest);
    const [leaderboards, setLeaderboards] = useState(initialLeaderboards);
    const [result, setResult] = useState<ArcadeSaveState>(IDLE);

    const begin = () => {
        setResult(IDLE);
        runRef.current = postJson<{ runId: number }>(start.url(game), {})
            .then((r) => r.runId)
            .catch(() => null);
    };

    const save = async (score: number, stats: Record<string, number>) => {
        setResult({ ...IDLE, saving: true });
        const runId = await runRef.current;

        if (runId === null) {
            setResult({ ...IDLE, error: FAILED });

            return;
        }

        try {
            const saved = await postJson<ArcadeRunResult>(
                finish.url({ game, run: runId }),
                { score, stats },
            );
            setBest(saved.personalBest);
            setLeaderboards(saved.leaderboards);
            setResult({ ...IDLE, isHighscore: saved.isHighscore });
        } catch {
            setResult({ ...IDLE, error: FAILED });
        }
    };

    return { best, leaderboards, result, begin, save };
}
