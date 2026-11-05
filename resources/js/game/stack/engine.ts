import { box } from "../draw/furni";
import { iso, shade } from "../iso";
import {
    BASE_SIZE,
    EMPTY_STATS,
    axisFor,
    drop,
    grow,
    score,
    shouldGrow,
    slide,
    spawn,
    speedFor,
} from "./logic";
import type { Axis, Rect, RunStats } from "./logic";
import { ArcadeSound } from "./sound";

type Ctx = CanvasRenderingContext2D;

/** Eenheden (logic.ts) → isometrische tegels: het eerste blok is 2,4 tegels breed. */
const S = 0.24;
/** Hoogte van één laag in px. */
const LAYER_PX = 14;
/** De sokkel onder de toren steekt zo ver naar beneden. */
const PEDESTAL_PX = 260;
const GRAVITY = 1500;
/** Midden van de toren op het scherm (iso-y van het midden van het eerste blok). */
const CENTER_Y = iso((BASE_SIZE / 2) * S, (BASE_SIZE / 2) * S).y;

type Layer = { rect: Rect; color: string };
type Debris = Layer & {
    z: number;
    vz: number;
    dx: number;
    dy: number;
    age: number;
};
type Ring = { rect: Rect; z: number; age: number };

export type StackPhase = "idle" | "playing" | "paused" | "over";

export interface StackEvents {
    /** Na elke geplaatste laag (niet per frame). */
    onStats?: (stats: RunStats) => void;
    onPerfect?: (combo: number) => void;
    onGameOver?: (stats: RunStats) => void;
}

/** Kleurverloop over de toren: elke laag schuift een stukje op de kleurencirkel. */
export function layerColor(i: number): string {
    const h = (205 + i * 7) % 360;
    const s = 0.72;
    const l = 0.6;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
        Math.round(
            (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))) * 255,
        );

    return `#${[f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Stack: isometrisch getekend op een <canvas>, met dezelfde box()-blokjes als
 * de meubels in het hotel. De pagina (pages/ontmoeten/stack.tsx) start, pauzeert
 * en stopt het spel en krijgt alleen events terug; React rendert dus niet per frame.
 */
export class StackEngine {
    phase: StackPhase = "idle";
    readonly sound = new ArcadeSound();

    private ctx: Ctx;
    private raf = 0;
    private last = 0;
    private dpr = 1;
    private view = { w: 0, h: 0 };
    private resize: ResizeObserver;

    private layers: Layer[] = [];
    private moving?: Rect;
    private axis: Axis = "x";
    private direction: 1 | -1 = 1;
    private debris: Debris[] = [];
    private rings: Ring[] = [];
    private stats: RunStats = EMPTY_STATS;
    private cam = { z: 0, zoom: 1 };

    constructor(
        private canvas: HTMLCanvasElement,
        private events: StackEvents = {},
        private reducedMotion = false,
    ) {
        this.ctx = canvas.getContext("2d")!;
        this.resize = new ResizeObserver(() => this.fit());
        this.resize.observe(canvas.parentElement ?? canvas);
        this.fit();
        this.reset();
        canvas.addEventListener("pointerdown", this.onPointer);
        window.addEventListener("keydown", this.onKey);
        this.raf = requestAnimationFrame(this.frame);
    }

    destroy() {
        cancelAnimationFrame(this.raf);
        this.resize.disconnect();
        this.canvas.removeEventListener("pointerdown", this.onPointer);
        window.removeEventListener("keydown", this.onKey);
        this.sound.close();
    }

    /** Nieuwe toren met alleen de sokkel (vóór de countdown en bij "Opnieuw"). */
    reset() {
        this.layers = [
            {
                rect: { x: 0, y: 0, w: BASE_SIZE, d: BASE_SIZE },
                color: layerColor(0),
            },
        ];
        this.moving = undefined;
        this.debris = [];
        this.rings = [];
        this.stats = EMPTY_STATS;
        this.cam = { z: LAYER_PX, zoom: 1 };
        this.phase = "idle";
    }

    start() {
        this.reset();
        this.phase = "playing";
        this.next();
        this.events.onStats?.(this.stats);
    }

    pause() {
        if (this.phase === "playing") this.phase = "paused";
    }

    resume() {
        if (this.phase === "paused") this.phase = "playing";
    }

    /** Klik, tik of spatie: het schuivende blok laten vallen. */
    press() {
        if (this.phase !== "playing" || !this.moving) return;

        const top = this.top();
        const result = drop(this.moving, top.rect, this.axis);
        const z = this.layers.length * LAYER_PX;
        const color = layerColor(this.layers.length);

        if (result.kind === "miss") {
            this.addDebris(result.debris, color, z);
            this.moving = undefined;
            this.phase = "over";
            this.sound.gameOver();
            this.events.onGameOver?.(this.stats);

            return;
        }

        this.stats = score(this.stats, result);
        let placed = result.placed;

        if (result.kind === "cut") {
            this.addDebris(result.debris, color, z);
            this.sound.drop(this.stats.blocks);
        } else {
            if (shouldGrow(this.stats.combo)) placed = grow(placed);
            this.rings.push({ rect: placed, z: z + LAYER_PX, age: 0 });
            this.sound.perfect(this.stats.combo);
            this.events.onPerfect?.(this.stats.combo);
        }

        this.layers.push({ rect: placed, color });
        this.events.onStats?.(this.stats);
        this.next();
    }

    // ─── Spelverloop ────────────────────────────────────────────────────────────

    private top() {
        return this.layers[this.layers.length - 1];
    }

    private next() {
        this.axis = axisFor(this.stats.blocks);
        this.moving = spawn(this.top().rect, this.axis);
        this.direction = 1;
    }

    /** Afgesneden stuk: valt met zwaartekracht naar beneden en drijft een beetje weg van de toren. */
    private addDebris(rect: Rect, color: string, z: number) {
        const below = this.top().rect;
        const cx = rect.x + rect.w / 2 - (below.x + below.w / 2);
        const cy = rect.y + rect.d / 2 - (below.y + below.d / 2);
        this.debris.push({
            rect,
            color,
            z,
            vz: 0,
            dx: Math.sign(cx) * 4,
            dy: Math.sign(cy) * 4,
            age: 0,
        });
    }

    private update(dt: number) {
        if (this.phase === "playing" && this.moving) {
            const step = slide(
                this.moving,
                this.top().rect,
                this.axis,
                this.direction,
                speedFor(this.stats.blocks) * dt,
            );
            this.moving = step.rect;
            this.direction = step.direction;
        }

        for (const d of this.debris) {
            d.vz -= GRAVITY * dt;
            d.z += d.vz * dt;
            d.rect = {
                ...d.rect,
                x: d.rect.x + d.dx * dt,
                y: d.rect.y + d.dy * dt,
            };
            d.age += dt;
        }
        this.debris = this.debris.filter((d) => d.age < 3);

        for (const r of this.rings) r.age += dt;
        this.rings = this.rings.filter((r) => r.age < 0.6);

        // Camera schuift mee omhoog; bij game over zoomt hij uit tot de hele toren in beeld is
        const height = this.layers.length * LAYER_PX;
        const over = this.phase === "over";
        const targetZ = over ? height / 2 : height + LAYER_PX;
        const targetZoom = over
            ? Math.min(1, (this.view.h * 0.55) / ((height + 80) * this.scale()))
            : 1;
        const ease = 1 - Math.exp(-dt * (this.reducedMotion ? 14 : 5));
        this.cam.z += (targetZ - this.cam.z) * ease;
        this.cam.zoom += (targetZoom - this.cam.zoom) * ease;
    }

    // ─── Tekenen ────────────────────────────────────────────────────────────────

    private frame = (now: number) => {
        const dt = this.last ? Math.min((now - this.last) / 1000, 0.05) : 0;
        this.last = now;
        this.update(dt);
        this.draw(now);
        this.raf = requestAnimationFrame(this.frame);
    };

    /** Basisschaal: de toren plus het schuifbereik past op het scherm, ook op een telefoon. */
    private scale() {
        return Math.max(
            0.6,
            Math.min(this.view.w / 460, this.view.h / 540, 2.2),
        );
    }

    private fit() {
        const parent = this.canvas.parentElement ?? this.canvas;
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.view = { w: parent.clientWidth, h: parent.clientHeight };
        this.canvas.width = Math.round(this.view.w * this.dpr);
        this.canvas.height = Math.round(this.view.h * this.dpr);
        this.canvas.style.width = `${this.view.w}px`;
        this.canvas.style.height = `${this.view.h}px`;
    }

    private draw(now: number) {
        const { ctx, view, dpr } = this;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const bg = ctx.createLinearGradient(0, 0, 0, view.h);
        bg.addColorStop(0, "#1E1B4B");
        bg.addColorStop(1, "#0F1E3A");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, view.w, view.h);
        this.drawStars();

        const s = this.scale() * this.cam.zoom;
        ctx.setTransform(
            dpr * s,
            0,
            0,
            dpr * s,
            (dpr * view.w) / 2,
            dpr * view.h * 0.6,
        );
        ctx.translate(0, -(CENTER_Y - this.cam.z));
        ctx.imageSmoothingEnabled = false;

        // Wat achter de toren valt eerst, wat ervoor valt erna
        const behind = (d: Debris) =>
            d.rect.x + d.rect.w / 2 + d.rect.y + d.rect.d / 2 < BASE_SIZE;
        for (const d of this.debris)
            if (behind(d)) this.block(d.rect, d.z, d.color);

        const base = this.layers[0];
        this.block(base.rect, -PEDESTAL_PX, "#3B2F7A", PEDESTAL_PX + LAYER_PX);
        this.layers.forEach(
            (l, i) => i > 0 && this.block(l.rect, i * LAYER_PX, l.color),
        );

        for (const d of this.debris)
            if (!behind(d)) this.block(d.rect, d.z, d.color);
        for (const r of this.rings) this.drawRing(r);

        if (this.moving)
            this.block(
                this.moving,
                this.layers.length * LAYER_PX,
                layerColor(this.layers.length),
            );

        // Knipperende pijl boven de toren zolang er nog niet geklikt is
        if (
            this.phase === "playing" &&
            this.stats.blocks === 0 &&
            Math.floor(now / 400) % 2 === 0
        ) {
            const p = iso(
                (BASE_SIZE / 2) * S,
                (BASE_SIZE / 2) * S,
                this.layers.length * LAYER_PX + 60,
            );
            ctx.fillStyle = "#FFFFFF";
            ctx.beginPath();
            ctx.moveTo(p.x - 7, p.y);
            ctx.lineTo(p.x + 7, p.y);
            ctx.lineTo(p.x, p.y + 9);
            ctx.closePath();
            ctx.fill();
        }
    }

    private block(r: Rect, z: number, color: string, h = LAYER_PX) {
        box(
            this.ctx,
            r.x * S,
            r.y * S,
            (r.x + r.w) * S,
            (r.y + r.d) * S,
            z,
            h,
            color,
        );
        // Lichte rand bovenop: maakt de lagen in de toren goed van elkaar te onderscheiden
        this.outline(r, z + h, shade(color, 0.35), 1);
    }

    /** Perfect drop: een witte rand die van het blok af uitdijt en vervaagt. */
    private drawRing(r: Ring) {
        const t = r.age / 0.6;
        const grow = this.reducedMotion ? 0 : t * 1.6;
        const rect = {
            x: r.rect.x - grow,
            y: r.rect.y - grow,
            w: r.rect.w + grow * 2,
            d: r.rect.d + grow * 2,
        };
        this.ctx.globalAlpha = 1 - t;
        this.outline(rect, r.z, "#FFFFFF", 2.5);
        this.ctx.globalAlpha = 1;
    }

    private outline(r: Rect, z: number, color: string, width: number) {
        const { ctx } = this;
        const pts = [
            iso(r.x * S, r.y * S, z),
            iso((r.x + r.w) * S, r.y * S, z),
            iso((r.x + r.w) * S, (r.y + r.d) * S, z),
            iso(r.x * S, (r.y + r.d) * S, z),
        ];
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
        ctx.closePath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
    }

    /** Pixelsterretjes die langzaam meeschuiven met de camera. */
    private drawStars() {
        const { ctx, view } = this;
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        for (let i = 0; i < 40; i++) {
            const x = (i * 97.3) % view.w;
            const y =
                (((i * 57.1 + this.cam.z * 0.15) % view.h) + view.h) % view.h;
            const size = i % 5 === 0 ? 3 : 2;
            ctx.fillRect(Math.round(x), Math.round(y), size, size);
        }
    }

    // ─── Invoer ─────────────────────────────────────────────────────────────────

    private onPointer = (e: PointerEvent) => {
        e.preventDefault();
        this.press();
    };

    private onKey = (e: KeyboardEvent) => {
        if (e.code !== "Space" && e.code !== "Enter") return;
        console.log("[stack] spatie ingedrukt", {
            fase: this.phase,
            laag: this.layers.length,
            combo: this.stats.combo,
        });
        // Spatie op een knop (Verlaten, geluid) is gewoon die knop indrukken
        if (
            (e.target as HTMLElement).closest("button, input, textarea, dialog")
        )
            return;
        if (this.phase !== "playing") return;
        e.preventDefault();
        if (!e.repeat) this.press();
    };
}
