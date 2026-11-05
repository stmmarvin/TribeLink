import type { AvatarLook } from "../types";
import { WaveRushAudio } from "./audio";
import { collide } from "./collision";
import type { Effect } from "./collision";
import { moveBoat } from "./obstacles";
import {
    POINTS,
    applyEffect,
    gateTime,
    isAirborne,
    maxSpeedFor,
    newPlayer,
    scoreOf,
    statsOf,
    updatePlayer,
} from "./player";
import type { PlayerState } from "./player";
import {
    BOOST_FOV,
    DRAW_DISTANCE,
    FOV,
    PLAYER_Z,
    Renderer,
    depthFor,
} from "./render";
import { makeSprites } from "./sprites";
import { SEGMENT_LENGTH, Track, UNITS_PER_METRE, difficultyAt } from "./track";

/** Interne resolutie: de kortste kant van het canvas, opgeschaald met image-rendering: pixelated. */
const PIXELS = 180;
const MAX_SIDE = 400;
/** Zo vaak per seconde krijgt React de HUD-waarden (niet elk frame). */
const HUD_MS = 100;
/** Omhoog swipen op mobiel: zo lang boosten (zolang de meter niet leeg is). */
const SWIPE_BOOST_S = 1.4;

export type WaveRushPhase = "idle" | "playing" | "paused" | "over";

export interface WaveRushHud {
    score: number;
    distance: number;
    speedKmh: number;
    /** Boost-meter 0–1. */
    boost: number;
    boosting: boolean;
    /** Seconden op de klok. */
    time: number;
    lives: number;
}

export type WaveRushStats = ReturnType<typeof statsOf>;

export interface WaveRushEvents {
    onHud?: (hud: WaveRushHud) => void;
    /** Korte melding boven de jetski: "+25", "TRICK +150", "CHECKPOINT +24s". */
    onPopup?: (text: string) => void;
    onPauseChange?: (paused: boolean) => void;
    onGameOver?: (stats: WaveRushStats, score: number) => void;
}

/**
 * Wave Rush: een retro pseudo-3D jetski-racer over open zee. Deze class verbindt de
 * onderdelen (track, player, obstacles/collision, render, audio), draait de
 * requestAnimationFrame-loop met delta time en vertaalt toetsen en touch naar
 * sturen en boosten. De pagina (pages/ontmoeten/wave-rush.tsx) krijgt alleen
 * events terug, dus React rendert niet per frame.
 */
export class WaveRushEngine {
    phase: WaveRushPhase = "idle";
    readonly audio = new WaveRushAudio();

    private ctx: CanvasRenderingContext2D;
    private renderer: Renderer;
    private resize: ResizeObserver;
    private raf = 0;
    private last = 0;
    private time = 0;
    private hudAt = 0;

    private track = new Track(1);
    private player: PlayerState = newPlayer();
    private position = 0;
    private skyOffset = 0;
    private cameraDepth = depthFor(FOV);
    private checkedSegment = -1;
    /** Laatste hele seconde op de klok (voor de tikjes in de laatste 5 seconden). */
    private lastSecond = 0;

    private keys = new Set<string>();
    private touches = new Map<number, { side: -1 | 1; y: number }>();
    private boostButton = false;
    private swipeBoost = 0;

    constructor(
        private canvas: HTMLCanvasElement,
        private events: WaveRushEvents = {},
        look: AvatarLook,
        private reducedMotion = false,
    ) {
        this.ctx = canvas.getContext("2d")!;
        this.renderer = new Renderer(this.ctx, makeSprites(), look);
        this.resize = new ResizeObserver(() => this.fit());
        this.resize.observe(canvas.parentElement ?? canvas);
        this.fit();
        this.reset();
        canvas.addEventListener("pointerdown", this.onPointerDown);
        canvas.addEventListener("pointermove", this.onPointerMove);
        canvas.addEventListener("pointerup", this.onPointerUp);
        canvas.addEventListener("pointercancel", this.onPointerUp);
        window.addEventListener("keydown", this.onKeyDown);
        window.addEventListener("keyup", this.onKeyUp);
        window.addEventListener("blur", this.onBlur);
        this.raf = requestAnimationFrame(this.frame);
    }

    destroy() {
        cancelAnimationFrame(this.raf);
        this.resize.disconnect();
        this.canvas.removeEventListener("pointerdown", this.onPointerDown);
        this.canvas.removeEventListener("pointermove", this.onPointerMove);
        this.canvas.removeEventListener("pointerup", this.onPointerUp);
        this.canvas.removeEventListener("pointercancel", this.onPointerUp);
        window.removeEventListener("keydown", this.onKeyDown);
        window.removeEventListener("keyup", this.onKeyUp);
        window.removeEventListener("blur", this.onBlur);
        this.audio.destroy();
    }

    /** Stilliggen aan de start (achter de countdown, en bij "Opnieuw"). */
    reset() {
        this.track = new Track(Math.floor(Math.random() * 2 ** 31));
        this.player = newPlayer();
        // Afstand gemeten bij de jetski, niet bij de camera erachter
        this.player.distance = PLAYER_Z / UNITS_PER_METRE;
        this.position = 0;
        this.skyOffset = 0;
        this.checkedSegment = -1;
        this.lastSecond = Math.ceil(this.player.time);
        this.phase = "idle";
        this.emitHud();
    }

    start() {
        if (this.phase !== "idle") this.reset();
        this.phase = "playing";
        (document.activeElement as HTMLElement | null)?.blur();
        this.audio.start();
    }

    pause() {
        if (this.phase !== "playing") return;
        this.phase = "paused";
        this.keys.clear();
        this.audio.pause();
        this.events.onPauseChange?.(true);
    }

    resume() {
        if (this.phase !== "paused") return;
        this.phase = "playing";
        this.audio.resume();
        this.events.onPauseChange?.(false);
    }

    /** Boostknop op mobiel (ingedrukt houden). */
    setBoost(on: boolean) {
        this.boostButton = on;
        if (on) this.audio.unlock();
    }

    // ─── Spelverloop ────────────────────────────────────────────────────────────

    private frame = (now: number) => {
        const dt = this.last ? Math.min((now - this.last) / 1000, 0.05) : 0;
        this.last = now;
        if (this.phase !== "paused") {
            this.time += dt;
            this.update(dt);
        }
        this.renderer.draw({
            track: this.track,
            position: this.position,
            player: this.player,
            speedRatio: this.speedRatio(),
            cameraDepth: this.cameraDepth,
            skyOffset: this.skyOffset,
            time: this.time,
        });
        this.raf = requestAnimationFrame(this.frame);
    };

    private speedRatio() {
        return Math.min(
            1,
            this.player.speed / maxSpeedFor(difficultyAt(this.playerSegment())),
        );
    }

    private playerSegment() {
        return Math.floor((this.position + PLAYER_Z) / SEGMENT_LENGTH);
    }

    private update(dt: number) {
        const p = this.player;
        const segIndex = this.playerSegment();
        const seg = this.track.get(segIndex);
        const difficulty = difficultyAt(segIndex);

        if (this.phase === "playing") {
            const wasBoosting = p.boosting;
            this.swipeBoost = Math.max(0, this.swipeBoost - dt);
            const happened = updatePlayer(
                p,
                { steer: this.steer(), boost: this.wantsBoost() },
                dt,
                seg.curve,
                difficulty,
            );
            if (happened === "timeup") {
                this.gameOver("TIJD OP!");
                return;
            }
            if (happened === "trick") {
                this.audio.trick();
                this.events.onPopup?.(`TRICK +${POINTS.trick}`);
            }
            if (happened) {
                // Landing na een golf: plons en de camera zakt even mee
                this.audio.splash();
                this.renderer.splash("land");
            }
            if (p.boosting && !wasBoosting) this.audio.boost();
            const second = Math.ceil(p.time);
            if (second < this.lastSecond && second <= 5) this.audio.tick();
            this.lastSecond = second;
            this.collide(segIndex, difficulty);
            if (p.lives === 0) {
                this.gameOver("GEEN LEVENS MEER!");
                return;
            }
        } else if (this.phase === "over") {
            // Na game over dobbert de jetski uit
            p.speed = Math.max(0, p.speed - 30 * dt);
            p.boosting = false;
        }

        this.position += p.speed * UNITS_PER_METRE * dt;
        const base = Math.floor(this.position / SEGMENT_LENGTH);
        for (let n = 0; n < DRAW_DISTANCE; n += 1)
            for (const o of this.track.get(base + n).objects) moveBoat(o, dt);
        this.track.prune(base - 5);

        const ratio = this.speedRatio();
        this.skyOffset += seg.curve * ratio * dt * 60;
        const fov = p.boosting && !this.reducedMotion ? BOOST_FOV : FOV;
        this.cameraDepth +=
            (depthFor(fov) - this.cameraDepth) * Math.min(1, dt * 4);

        if (this.phase === "playing") {
            this.audio.setSpeed(ratio, p.boosting);
            if (!isAirborne(p)) this.renderer.spray(ratio, this.steer(), dt);
        }
        this.renderer.update(dt);

        if (this.time * 1000 - this.hudAt >= HUD_MS) {
            this.hudAt = this.time * 1000;
            this.emitHud();
        }
    }

    /** Alles op de segmenten waar de jetski net (of nu) is. */
    private collide(segIndex: number, difficulty: number) {
        const p = this.player;
        const rider = {
            x: p.x,
            airborne: isAirborne(p),
            invulnerable: p.invulnerable > 0,
        };

        for (
            let i = Math.max(this.checkedSegment, segIndex - 3);
            i <= segIndex;
            i++
        ) {
            for (const object of this.track.get(i).objects) {
                const effect = collide(rider, object);
                if (!effect) continue;
                object.taken = true;
                this.handle(effect, difficulty);
            }
        }
        this.checkedSegment = segIndex;
    }

    private handle(effect: Effect, difficulty: number) {
        applyEffect(this.player, effect, difficulty);

        switch (effect) {
            case "coin":
                this.audio.coin();
                this.events.onPopup?.(`+${POINTS.coin}`);
                break;
            case "boost":
                this.audio.coin();
                this.events.onPopup?.("BOOST!");
                break;
            case "gate":
                this.audio.checkpoint();
                this.events.onPopup?.(`CHECKPOINT +${gateTime(difficulty)}s`);
                break;
            case "ramp":
                this.audio.splash();
                this.events.onPopup?.("GOLF! STUUR ← →");
                break;
            case "bump":
                this.audio.splash();
                this.renderer.splash("hit");
                break;
            case "crash":
                this.audio.crash();
                this.renderer.splash("hit");
                if (this.player.lives > 0)
                    this.events.onPopup?.("AU! -1 LEVEN");
                this.emitHud();
                break;
        }
    }

    /** Tijd of levens op: de jetski dobbert uit en React krijgt de eindstand. */
    private gameOver(reason: string) {
        const p = this.player;
        this.phase = "over";
        this.audio.gameOver();
        this.events.onPopup?.(reason);
        this.emitHud();
        this.events.onGameOver?.(statsOf(p), scoreOf(p));
    }

    private emitHud() {
        const p = this.player;
        this.events.onHud?.({
            score: scoreOf(p),
            distance: Math.floor(p.distance),
            speedKmh: Math.round(p.speed * 3.6),
            boost: p.boost,
            boosting: p.boosting,
            time: p.time,
            lives: p.lives,
        });
    }

    private fit() {
        const parent = this.canvas.parentElement ?? this.canvas;
        const w = parent.clientWidth || 320;
        const h = parent.clientHeight || 180;
        const scale = Math.max(
            Math.min(w, h) / PIXELS,
            Math.max(w, h) / MAX_SIDE,
        );
        this.canvas.width = Math.round(w / scale);
        this.canvas.height = Math.round(h / scale);
        this.renderer.resize(this.canvas.width, this.canvas.height);
    }

    // ─── Invoer ─────────────────────────────────────────────────────────────────

    private steer() {
        let steer = 0;
        if (this.keys.has("ArrowLeft") || this.keys.has("KeyA")) steer -= 1;
        if (this.keys.has("ArrowRight") || this.keys.has("KeyD")) steer += 1;
        for (const t of this.touches.values()) steer += t.side;
        return Math.max(-1, Math.min(1, steer));
    }

    private wantsBoost() {
        return (
            this.keys.has("Space") || this.boostButton || this.swipeBoost > 0
        );
    }

    private onKeyDown = (e: KeyboardEvent) => {
        if ((e.target as HTMLElement).closest("input, textarea, dialog"))
            return;
        this.audio.unlock();

        if (e.code === "Escape" || e.code === "KeyP") {
            if (this.phase === "playing") this.pause();
            else if (this.phase === "paused") this.resume();
            return;
        }

        if (this.phase !== "playing") return;
        if (
            ["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space"].includes(
                e.code,
            )
        ) {
            e.preventDefault();
            this.keys.add(e.code);
        }
    };

    private onKeyUp = (e: KeyboardEvent) => {
        if (this.keys.delete(e.code)) e.preventDefault();
    };

    private onBlur = () => {
        this.keys.clear();
        this.touches.clear();
        this.pause();
    };

    /** Links of rechts van het midden vasthouden = sturen; omhoog swipen = boost. */
    private onPointerDown = (e: PointerEvent) => {
        e.preventDefault();
        this.audio.unlock();
        const rect = this.canvas.getBoundingClientRect();
        this.touches.set(e.pointerId, {
            side: e.clientX < rect.left + rect.width / 2 ? -1 : 1,
            y: e.clientY,
        });
        this.canvas.setPointerCapture?.(e.pointerId);
    };

    private onPointerMove = (e: PointerEvent) => {
        const touch = this.touches.get(e.pointerId);
        if (touch && touch.y - e.clientY > 40) {
            this.swipeBoost = SWIPE_BOOST_S;
            touch.y = e.clientY;
        }
    };

    private onPointerUp = (e: PointerEvent) => {
        this.touches.delete(e.pointerId);
    };
}
