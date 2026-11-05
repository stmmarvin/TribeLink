import { Head, router, usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import { GameOver } from "@/components/arcade/game-over";
import { Countdown } from "@/components/games/countdown";
import { prefersReducedMotion } from "@/components/games/pixel-transition";
import {
    GameTransition,
    markTransition,
    useTransitionReveal,
} from "@/components/games/transition";
import { Button } from "@/components/tribelink/button";
import { Modal } from "@/components/tribelink/modal";
import { StackEngine } from "@/game/stack/engine";
import { EMPTY_STATS } from "@/game/stack/logic";
import type { RunStats } from "@/game/stack/logic";
import { useArcadeRun } from "@/hooks/use-arcade-run";
import { PageHeader } from "@/layouts/app-layout";
import { CABINETS, markArcadeReturn } from "@/lib/arcade";
import { lobby } from "@/routes/ontmoeten";
import type { ArcadeLeaderboards } from "@/types";

type Phase = "countdown" | "playing" | "over";

/** Countdown 3 → 2 → 1 → 0, like before a chess game. */
const COUNTDOWN_SECONDS = 4;

/**
 * Stack, played at the Stack cabinet in the Arcade (ArcadeController). The
 * game itself runs in StackEngine on a canvas; this page only shows the
 * countdown, score, "Verlaten" and the game over screen, and saves the score.
 */
export default function StackPage({
    personalBest: initialBest,
    leaderboards: initialLeaderboards,
}: {
    game: { id: string; name: string };
    personalBest: number;
    leaderboards: ArcadeLeaderboards;
}) {
    const { props } = usePage();
    const myId = Number(props.auth.user.id);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<StackEngine>(undefined);
    // The run on the server, started together with the countdown
    const run = useArcadeRun("stack", initialBest, initialLeaderboards);

    const [phase, setPhase] = useState<Phase>("countdown");
    const [stats, setStats] = useState<RunStats>(EMPTY_STATS);
    const [perfect, setPerfect] = useState<{
        combo: number;
        key: number;
    } | null>(null);
    const [muted, setMuted] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [reveal, revealDone] = useTransitionReveal();

    useEffect(() => {
        const engine = new StackEngine(
            canvasRef.current!,
            {
                onStats: setStats,
                onPerfect: (combo) =>
                    setPerfect({ combo, key: performance.now() }),
                onGameOver: (final) => {
                    setStats(final);
                    setPhase("over");
                    void run.save(final.score, {
                        blocks: final.blocks,
                        perfects: final.perfects,
                    });
                },
            },
            prefersReducedMotion(),
        );
        engineRef.current = engine;
        // Handy while debugging: `__stack` in the browser console (dev only)
        if (import.meta.env.DEV) Object.assign(window, { __stack: engine });
        setMuted(engine.sound.muted);

        return () => engine.destroy();
        // run.save only uses refs and setters
    }, []);

    // A new run on the server as soon as the countdown starts
    useEffect(() => {
        if (phase !== "countdown" || reveal) return;

        run.begin();
    }, [phase, reveal]);

    useEffect(() => {
        if (!perfect) return;
        const timer = window.setTimeout(() => setPerfect(null), 800);

        return () => window.clearTimeout(timer);
    }, [perfect]);

    const again = () => {
        engineRef.current?.reset();
        setStats(EMPTY_STATS);
        setPhase("countdown");
    };

    const askLeave = () => {
        if (phase !== "playing") {
            setLeaving(true);

            return;
        }

        engineRef.current?.pause();
        setConfirmLeave(true);
    };

    const keepPlaying = () => {
        setConfirmLeave(false);
        engineRef.current?.resume();
    };

    const toggleMute = () => {
        const engine = engineRef.current;
        if (!engine) return;
        engine.sound.setMuted(!engine.sound.muted);
        setMuted(engine.sound.muted);
    };

    return (
        <>
            <Head title="Stack" />
            <PageHeader
                title="Stack"
                actions={
                    <div className="flex items-center gap-2">
                        <p className="hidden text-[12px] leading-[18px] text-ink-muted sm:block">
                            Klik, tik of druk op spatie
                        </p>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={askLeave}
                        >
                            Verlaten
                        </Button>
                    </div>
                }
            />

            <div className="relative h-dvh overflow-hidden bg-ink select-none lg:h-[calc(100vh-72px)]">
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 block touch-none"
                    aria-label="Stack: laat het schuivende blok op de toren vallen"
                />

                {/* Score bovenaan, geluid rechtsboven */}
                <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-between lg:inset-x-4 lg:top-4">
                    <span className="rounded-pill bg-ink/70 px-3.5 py-2 font-pixel text-[11px] text-white/80 uppercase backdrop-blur">
                        Best {run.best}
                    </span>
                    <div className="pointer-events-auto flex gap-2">
                        {/* The page header (with "Verlaten") is hidden on phones */}
                        <button
                            type="button"
                            onClick={askLeave}
                            className="h-9 rounded-pill bg-ink/70 px-3.5 font-pixel text-[11px] text-white uppercase backdrop-blur hover:bg-ink/85 lg:hidden"
                        >
                            Verlaten
                        </button>
                        <button
                            type="button"
                            onClick={toggleMute}
                            aria-pressed={muted}
                            aria-label={muted ? "Geluid aan" : "Geluid uit"}
                            className="flex size-9 items-center justify-center rounded-pill bg-ink/70 text-[16px] text-white backdrop-blur hover:bg-ink/85"
                        >
                            {muted ? "🔇" : "🔊"}
                        </button>
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 top-[10%] z-10 flex flex-col items-center gap-1">
                    <p
                        aria-live="polite"
                        className="font-pixel text-[64px] leading-none text-white [text-shadow:4px_4px_0_#2f6bff] sm:text-[80px]"
                    >
                        {stats.score}
                    </p>
                    {stats.combo > 1 && (
                        <p className="font-pixel text-[12px] text-cyan uppercase">
                            Combo ×{stats.combo}
                        </p>
                    )}
                    {perfect && (
                        <p
                            key={perfect.key}
                            className="animate-perfect-pop font-pixel text-[18px] text-sunshine uppercase [text-shadow:2px_2px_0_#0f1e3a]"
                        >
                            Perfect!
                        </p>
                    )}
                </div>

                {phase === "over" && (
                    <GameOver
                        score={stats.score}
                        details={`${stats.blocks} ${stats.blocks === 1 ? "blok" : "blokken"} · ${stats.perfects} perfect`}
                        // While saving, your score already counts; a rejected score doesn't
                        personalBest={
                            run.result.error
                                ? run.best
                                : Math.max(run.best, stats.score)
                        }
                        isHighscore={run.result.isHighscore}
                        leaderboards={run.leaderboards}
                        myId={myId}
                        saving={run.result.saving}
                        error={run.result.error}
                        onAgain={again}
                        onBack={() => setLeaving(true)}
                    />
                )}
                {phase === "countdown" && !reveal && (
                    <Countdown
                        seconds={COUNTDOWN_SECONDS}
                        label="Stack begint over"
                        onDone={() => {
                            setPhase("playing");
                            engineRef.current?.start();
                        }}
                    />
                )}
                {reveal && (
                    <GameTransition
                        kind={reveal}
                        mode="reveal"
                        onDone={revealDone}
                    />
                )}
                {leaving && (
                    <GameTransition
                        kind="pixel"
                        mode="cover"
                        onDone={() => {
                            markTransition("pixel");
                            markArcadeReturn(CABINETS["stack-1"].cabinet);
                            router.visit(
                                lobby.url({ query: { kamer: "arcade" } }),
                            );
                        }}
                    />
                )}
            </div>

            <Modal
                open={confirmLeave}
                onClose={keepPlaying}
                title="Spel verlaten?"
                description="Het spel staat op pauze. Ga je nu weg, dan telt deze toren niet mee voor je score."
            >
                <div className="flex flex-col gap-3">
                    <Button
                        variant="danger"
                        fullWidth
                        onClick={() => {
                            setConfirmLeave(false);
                            setLeaving(true);
                        }}
                    >
                        Terug naar arcade
                    </Button>
                    <Button variant="secondary" fullWidth onClick={keepPlaying}>
                        Doorspelen
                    </Button>
                </div>
            </Modal>
        </>
    );
}
