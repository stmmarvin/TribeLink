import { Head, router, usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
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
import { loadLook } from "@/game/look";
import { WaveRushEngine } from "@/game/wave-rush/engine";
import type { WaveRushHud, WaveRushStats } from "@/game/wave-rush/engine";
import { LIVES, START_TIME } from "@/game/wave-rush/player";
import { useArcadeRun } from "@/hooks/use-arcade-run";
import { PageHeader } from "@/layouts/app-layout";
import { CABINETS, markArcadeReturn } from "@/lib/arcade";
import { cn } from "@/lib/utils";
import { lobby } from "@/routes/ontmoeten";
import type { ArcadeLeaderboards } from "@/types";

type Phase = "countdown" | "playing" | "over";

/** Countdown 3 → 2 → 1 → 0, like before a chess game. */
const COUNTDOWN_SECONDS = 4;

const EMPTY_HUD: WaveRushHud = {
    score: 0,
    distance: 0,
    speedKmh: 0,
    boost: 0,
    boosting: false,
    time: START_TIME,
    lives: LIVES,
};

/** Donkere rand om pixeltekst, zodat hij leesbaar blijft op het water en de lucht. */
const OUTLINED =
    "[text-shadow:2px_0_0_#0f1e3a,-2px_0_0_#0f1e3a,0_2px_0_#0f1e3a,0_-2px_0_#0f1e3a,2px_2px_0_#0f1e3a]";

/**
 * Wave Rush, played at the jetski cabinet in the Arcade (ArcadeController).
 * The game runs in WaveRushEngine on a small canvas that is scaled up with
 * pixelated rendering; this page shows the HUD, pause, "Verlaten" and the game
 * over screen, and saves the score.
 */
export default function WaveRushPage({
    personalBest,
    leaderboards,
}: {
    game: { id: string; name: string };
    personalBest: number;
    leaderboards: ArcadeLeaderboards;
}) {
    const { props } = usePage();
    const myId = Number(props.auth.user.id);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<WaveRushEngine>(undefined);
    const run = useArcadeRun("wave-rush", personalBest, leaderboards);

    const [phase, setPhase] = useState<Phase>("countdown");
    const [hud, setHud] = useState<WaveRushHud>(EMPTY_HUD);
    const [final, setFinal] = useState<{
        stats: WaveRushStats;
        score: number;
    } | null>(null);
    const [popup, setPopup] = useState<{ text: string; key: number } | null>(
        null,
    );
    const [paused, setPaused] = useState(false);
    const [muted, setMuted] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [reveal, revealDone] = useTransitionReveal();

    useEffect(() => {
        const engine = new WaveRushEngine(
            canvasRef.current!,
            {
                onHud: setHud,
                onPopup: (text) => setPopup({ text, key: performance.now() }),
                onPauseChange: setPaused,
                onGameOver: (stats, score) => {
                    setFinal({ stats, score });
                    setPhase("over");
                    void run.save(score, stats);
                },
            },
            loadLook(),
            prefersReducedMotion(),
        );
        engineRef.current = engine;
        // Handy while debugging: `__waveRush` in the browser console (dev only)
        if (import.meta.env.DEV) Object.assign(window, { __waveRush: engine });
        setMuted(engine.audio.muted);

        return () => engine.destroy();
        // run.save only uses refs and setters
    }, []);

    // A new run on the server as soon as the countdown starts
    useEffect(() => {
        if (phase !== "countdown" || reveal) return;
        run.begin();
    }, [phase, reveal]);

    useEffect(() => {
        if (!popup) return;
        const timer = window.setTimeout(() => setPopup(null), 800);

        return () => window.clearTimeout(timer);
    }, [popup]);

    const again = () => {
        engineRef.current?.reset();
        setFinal(null);
        setHud(EMPTY_HUD);
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

    const togglePause = () =>
        paused ? engineRef.current?.resume() : engineRef.current?.pause();

    const toggleMute = () => {
        const engine = engineRef.current;
        if (!engine) return;
        engine.audio.setMuted(!engine.audio.muted);
        setMuted(engine.audio.muted);
    };

    const stats = final?.stats;

    return (
        <>
            <Head title="Wave Rush" />
            <PageHeader
                title="Wave Rush"
                actions={
                    <div className="flex items-center gap-2">
                        <p className="hidden text-[12px] leading-[18px] text-ink-muted xl:block">
                            ← → sturen · spatie boost · Esc pauze
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
                    className="absolute inset-0 block size-full touch-none [image-rendering:pixelated]"
                    aria-label="Wave Rush: stuur je jetski langs de obstakels"
                />

                {/* HUD bovenaan: beste score links, aftellende tijd in het midden, knoppen rechts */}
                <div className="pointer-events-none absolute inset-x-3 top-3 z-20 grid grid-cols-[1fr_auto_1fr] items-start gap-2 lg:inset-x-4 lg:top-4">
                    <div
                        className={cn(
                            "flex flex-col font-pixel text-white uppercase",
                            OUTLINED,
                        )}
                    >
                        <span className="text-[10px] text-sunshine">Best</span>
                        <span className="text-[16px] leading-none">
                            {run.best}
                        </span>
                        <span
                            className="mt-2 flex gap-1"
                            role="img"
                            aria-label={`${hud.lives} van ${LIVES} levens`}
                        >
                            {Array.from({ length: LIVES }, (_, i) => (
                                <Heart key={i} full={i < hud.lives} />
                            ))}
                        </span>
                    </div>
                    <div
                        className={cn(
                            "flex flex-col items-center font-pixel uppercase",
                            OUTLINED,
                        )}
                    >
                        <span className="text-[10px] text-white">Tijd</span>
                        <span
                            role="timer"
                            aria-label={`${Math.ceil(hud.time)} seconden`}
                            className={cn(
                                "text-[44px] leading-none sm:text-[56px]",
                                hud.time <= 10 ? "text-coral" : "text-white",
                                hud.time <= 5 &&
                                    Math.floor(hud.time * 4) % 2 === 0 &&
                                    "opacity-60",
                            )}
                        >
                            {Math.ceil(hud.time)}
                        </span>
                        <span className="mt-1 text-[11px] text-cyan">
                            {hud.score} pt · {hud.distance} m
                        </span>
                    </div>
                    <div className="pointer-events-auto flex justify-end gap-2">
                        {/* The page header (with "Verlaten") is hidden on phones */}
                        <HudButton
                            onClick={askLeave}
                            className="px-3.5 lg:hidden"
                        >
                            Verlaten
                        </HudButton>
                        <HudButton
                            onClick={togglePause}
                            aria-label={paused ? "Doorgaan" : "Pauze"}
                            disabled={phase !== "playing"}
                            className="w-9"
                        >
                            {paused ? "▶" : "II"}
                        </HudButton>
                        <HudButton
                            onClick={toggleMute}
                            aria-pressed={muted}
                            aria-label={muted ? "Geluid aan" : "Geluid uit"}
                            className="w-9 text-[16px]"
                        >
                            {muted ? "🔇" : "🔊"}
                        </HudButton>
                    </div>
                </div>

                {/* Rechtsonder: snelheidsmeter met wijzer, digitale snelheid en boost-meter */}
                <div className="pointer-events-none absolute right-3 bottom-3 z-20 flex flex-col items-center gap-1 lg:right-4 lg:bottom-4">
                    <Speedometer kmh={hud.speedKmh} boosting={hud.boosting} />
                    <span className="block h-2.5 w-24 border-2 border-ink bg-ink/80">
                        <span
                            className={cn(
                                "block h-full",
                                hud.boosting ? "bg-sunshine" : "bg-cyan",
                            )}
                            style={{
                                width: `${Math.round(hud.boost * 100)}%`,
                            }}
                        />
                    </span>
                    <span
                        className={cn(
                            "font-pixel text-[9px] text-white uppercase",
                            OUTLINED,
                        )}
                    >
                        Boost
                    </span>
                </div>

                {/* Boostknop voor touch (links, de snelheidsmeter staat rechts): ingedrukt houden */}
                {phase === "playing" && (
                    <button
                        type="button"
                        aria-label="Boost (ingedrukt houden)"
                        onPointerDown={() => engineRef.current?.setBoost(true)}
                        onPointerUp={() => engineRef.current?.setBoost(false)}
                        onPointerCancel={() =>
                            engineRef.current?.setBoost(false)
                        }
                        onPointerLeave={() =>
                            engineRef.current?.setBoost(false)
                        }
                        className="absolute bottom-3 left-3 z-20 size-16 touch-none rounded-pill border-4 border-ink bg-sunshine font-pixel text-[11px] text-ink uppercase shadow-[4px_4px_0_0_rgb(15_30_58/0.85)] active:translate-y-0.5 lg:hidden"
                    >
                        Boost
                    </button>
                )}

                {popup && (
                    <p
                        key={popup.key}
                        className={cn(
                            "pointer-events-none absolute inset-x-0 top-[34%] z-10 animate-perfect-pop text-center font-pixel text-[16px] text-sunshine uppercase",
                            OUTLINED,
                        )}
                    >
                        {popup.text}
                    </p>
                )}

                {paused && !confirmLeave && phase === "playing" && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink/60 p-4">
                        <section
                            role="dialog"
                            aria-modal="true"
                            aria-label="Pauze"
                            className="w-full max-w-xs [animation:fade-in-soft_180ms_ease-out_both] overflow-hidden rounded-card border-4 border-ink bg-surface shadow-[6px_6px_0_0_rgb(15_30_58)]"
                        >
                            <header className="bg-brand px-4 py-2.5">
                                <h2 className="font-pixel text-[13px] tracking-wide text-white uppercase">
                                    Pauze
                                </h2>
                            </header>
                            <div className="flex flex-col gap-2 p-5">
                                <Button
                                    size="md"
                                    fullWidth
                                    autoFocus
                                    onClick={() => engineRef.current?.resume()}
                                >
                                    Doorgaan
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="md"
                                    fullWidth
                                    onClick={() => setConfirmLeave(true)}
                                >
                                    Verlaten
                                </Button>
                            </div>
                        </section>
                    </div>
                )}

                {phase === "over" && final && stats && (
                    <GameOver
                        score={final.score}
                        details={`${stats.distance} m · ${stats.coins} ${stats.coins === 1 ? "munt" : "munten"} · ${stats.tricks} ${stats.tricks === 1 ? "trick" : "tricks"}`}
                        // While saving, your score already counts; a rejected score doesn't
                        personalBest={
                            run.result.error
                                ? run.best
                                : Math.max(run.best, final.score)
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
                        label="Wave Rush begint over"
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
                        kind="wave"
                        mode="cover"
                        onDone={() => {
                            markTransition("wave");
                            markArcadeReturn(CABINETS["waverush-1"].cabinet);
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
                description="Het spel staat op pauze. Ga je nu weg, dan telt deze rit niet mee voor je score."
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

function HudButton({ className, ...props }: ComponentProps<"button">) {
    return (
        <button
            type="button"
            className={cn(
                "flex h-9 items-center justify-center rounded-pill bg-ink/70 font-pixel text-[11px] text-white uppercase backdrop-blur hover:bg-ink/85 disabled:opacity-50",
                className,
            )}
            {...props}
        />
    );
}

/** Pixelhartje voor de levens (leeg = verloren). */
function Heart({ full }: { full: boolean }) {
    return (
        <svg
            aria-hidden
            viewBox="0 0 7 6"
            shapeRendering="crispEdges"
            className={cn("h-[18px] w-[21px]", !full && "opacity-80")}
        >
            <path
                d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z"
                fill="#0F1E3A"
            />
            <path
                d="M1 1h2v1h1V1h2v2H5v1H4v1H3V4H2V3H1z"
                fill={full ? "#FF4D4D" : "#4B5B78"}
            />
        </svg>
    );
}

/** Snelheidsmeter: halve wijzerplaat tot 300 km/u met een wijzer en de snelheid digitaal. */
function Speedometer({ kmh, boosting }: { kmh: number; boosting: boolean }) {
    const max = 300;
    // Wijzer van links (-120°) naar rechts (+120°)
    const angle = -120 + (Math.min(kmh, max) / max) * 240;
    const ticks = Array.from({ length: 7 }, (_, i) => -120 + i * 40);

    return (
        <div className="relative size-24 rounded-pill border-4 border-ink bg-ink/80 shadow-[3px_3px_0_0_rgb(15_30_58/0.6)]">
            <svg
                aria-hidden
                viewBox="-50 -50 100 100"
                shapeRendering="crispEdges"
                className="absolute inset-0 size-full"
            >
                {ticks.map((t) => (
                    <rect
                        key={t}
                        x="-2"
                        y="-44"
                        width="4"
                        height="9"
                        fill={t > 60 ? "#FF6B6B" : "#FFFFFF"}
                        transform={`rotate(${t})`}
                    />
                ))}
                <rect
                    x="-2"
                    y="-38"
                    width="4"
                    height="40"
                    fill={boosting ? "#FFB627" : "#22D3EE"}
                    transform={`rotate(${angle})`}
                />
                <rect x="-6" y="-6" width="12" height="12" fill="#FFFFFF" />
            </svg>
            <span
                aria-label={`${kmh} kilometer per uur`}
                className={cn(
                    "absolute inset-x-0 bottom-3 text-center font-pixel text-[13px] leading-none text-white",
                    OUTLINED,
                )}
            >
                {kmh}
                <span className="block text-[7px] text-white/70">km/u</span>
            </span>
        </div>
    );
}
