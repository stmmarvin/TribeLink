/**
 * Stack — pure spelregels, zonder canvas of DOM (getest in logic.test.ts).
 *
 * De toren staat in een plat vlak van "eenheden": het eerste blok is
 * BASE_SIZE × BASE_SIZE. Elke laag schuift langs één as (om en om x en y);
 * bij het laten vallen wordt het deel dat buiten de laag eronder hangt
 * afgesneden.
 */

/** Rechthoek in het torenvlak: (x, y) is de hoek met de kleinste coördinaten. */
export type Rect = { x: number; y: number; w: number; d: number };

export type Axis = "x" | "y";

export const BASE_SIZE = 10;
/** Zo dicht (in eenheden) bij de laag eronder telt als perfect: niets wordt afgesneden. */
export const PERFECT_TOLERANCE = 0.3;
/** Na zoveel perfects op rij groeit het blok een stukje terug. */
export const GROW_EVERY = 3;
export const GROW_AMOUNT = 0.6;
/** Bonus per perfect = de combo, maar nooit meer dan dit (config/arcade.php → max_perfect_bonus). */
export const MAX_PERFECT_BONUS = 3;

/** Snelheid van het schuivende blok in eenheden per seconde. */
export const BASE_SPEED = 9;
export const SPEED_STEP = 0.35;
export const MAX_SPEED = 24;
/** Zo ver naast de laag eronder begint een nieuw blok te schuiven. */
export const SLIDE_RANGE = 14;

export type DropResult =
    | { kind: "miss"; debris: Rect }
    | { kind: "perfect"; placed: Rect }
    | { kind: "cut"; placed: Rect; debris: Rect };

const pos = (r: Rect, axis: Axis) => (axis === "x" ? r.x : r.y);
const size = (r: Rect, axis: Axis) => (axis === "x" ? r.w : r.d);

/** Kopie van `r` met positie en grootte langs `axis` vervangen. */
function along(r: Rect, axis: Axis, p: number, s: number): Rect {
    return axis === "x" ? { ...r, x: p, w: s } : { ...r, y: p, d: s };
}

/**
 * Laat het schuivende blok op de laag eronder vallen. Langs de schuif-as wordt
 * afgesneden wat erbuiten hangt; dat stuk valt naar beneden (`debris`).
 */
export function drop(
    moving: Rect,
    below: Rect,
    axis: Axis,
    tolerance = PERFECT_TOLERANCE,
): DropResult {
    const m0 = pos(moving, axis);
    const m1 = m0 + size(moving, axis);
    const b0 = pos(below, axis);
    const b1 = b0 + size(below, axis);
    const start = Math.max(m0, b0);
    const end = Math.min(m1, b1);

    if (end - start <= 0) {
        return { kind: "miss", debris: moving };
    }

    if (Math.abs(m0 - b0) <= tolerance) {
        // Precies erop: vastklikken op de laag eronder
        return {
            kind: "perfect",
            placed: along(moving, axis, b0, size(moving, axis)),
        };
    }

    const placed = along(moving, axis, start, end - start);
    const debris =
        m0 < b0
            ? along(moving, axis, m0, b0 - m0)
            : along(moving, axis, b1, m1 - b1);

    return { kind: "cut", placed, debris };
}

/** Blok een stukje laten groeien (vanuit het midden), nooit groter dan BASE_SIZE. */
export function grow(r: Rect, amount = GROW_AMOUNT): Rect {
    const w = Math.min(BASE_SIZE, r.w + amount);
    const d = Math.min(BASE_SIZE, r.d + amount);

    return { x: r.x - (w - r.w) / 2, y: r.y - (d - r.d) / 2, w, d };
}

export type RunStats = {
    /** Geplaatste blokken (de basis telt niet mee). */
    blocks: number;
    perfects: number;
    /** Perfects op rij. */
    combo: number;
    score: number;
};

export const EMPTY_STATS: RunStats = {
    blocks: 0,
    perfects: 0,
    combo: 0,
    score: 0,
};

/** Score bijwerken na een drop: 1 punt per blok, plus een combo-bonus voor een perfect. */
export function score(stats: RunStats, result: DropResult): RunStats {
    if (result.kind === "miss") {
        return stats;
    }

    if (result.kind === "cut") {
        return {
            ...stats,
            blocks: stats.blocks + 1,
            combo: 0,
            score: stats.score + 1,
        };
    }

    const combo = stats.combo + 1;

    return {
        blocks: stats.blocks + 1,
        perfects: stats.perfects + 1,
        combo,
        score: stats.score + 1 + Math.min(combo, MAX_PERFECT_BONUS),
    };
}

/** Groeit het blok terug na deze combo? */
export const shouldGrow = (combo: number) =>
    combo > 0 && combo % GROW_EVERY === 0;

/** Schuifsnelheid voor een toren van `blocks` hoog: loopt langzaam op tot MAX_SPEED. */
export const speedFor = (blocks: number) =>
    Math.min(MAX_SPEED, BASE_SPEED + blocks * SPEED_STEP);

/** De as van de volgende laag: om en om. */
export const axisFor = (blocks: number): Axis => (blocks % 2 === 0 ? "x" : "y");

/** Nieuw blok: even groot als de laag eronder, SLIDE_RANGE ernaast langs de schuif-as. */
export function spawn(below: Rect, axis: Axis): Rect {
    return along(
        below,
        axis,
        pos(below, axis) - SLIDE_RANGE,
        size(below, axis),
    );
}

/**
 * Schuivend blok één stap verder (heen en weer tussen ±SLIDE_RANGE rond de laag eronder).
 * Geeft de nieuwe rechthoek en richting terug.
 */
export function slide(
    moving: Rect,
    below: Rect,
    axis: Axis,
    direction: 1 | -1,
    distance: number,
): { rect: Rect; direction: 1 | -1 } {
    const min = pos(below, axis) - SLIDE_RANGE;
    const max = pos(below, axis) + SLIDE_RANGE;
    let p = pos(moving, axis) + direction * distance;
    let dir = direction;

    if (p > max) {
        p = max - (p - max);
        dir = -1;
    } else if (p < min) {
        p = min + (min - p);
        dir = 1;
    }

    return { rect: along(moving, axis, p, size(moving, axis)), direction: dir };
}
