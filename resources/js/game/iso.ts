import type { Dir } from "./types";

/**
 * Isometrische projectie (2:1, zoals Habbo): een tegel is 64 × 32 px.
 * Tegel (x, y) beslaat [x, x+1] × [y, y+1]; `iso(x, y)` is de bovenste hoek.
 *   +x  → schuin rechtsonder op het scherm
 *   +y  → schuin linksonder op het scherm
 *   z   → recht omhoog (in px)
 */
export const TILE_W = 64;
export const TILE_H = 32;
/** Hoogte van één niveau in de hoogtekaart (traptrede). */
export const LEVEL_H = 16;

export function iso(tx: number, ty: number, z = 0) {
    return { x: (tx - ty) * (TILE_W / 2), y: (tx + ty) * (TILE_H / 2) - z };
}

/** Midden van een tegel op het scherm (voeten van een avatar). */
export function tileCenter(x: number, y: number, z = 0) {
    return iso(x + 0.5, y + 0.5, z);
}

export const DIRS: Record<Dir, { dx: number; dy: number }> = {
    0: { dx: 0, dy: -1 },
    1: { dx: 1, dy: -1 },
    2: { dx: 1, dy: 0 },
    3: { dx: 1, dy: 1 },
    4: { dx: 0, dy: 1 },
    5: { dx: -1, dy: 1 },
    6: { dx: -1, dy: 0 },
    7: { dx: -1, dy: -1 },
};

export function dirFromDelta(dx: number, dy: number): Dir {
    const sx = Math.sign(dx);
    const sy = Math.sign(dy);
    for (const [d, v] of Object.entries(DIRS))
        if (v.dx === sx && v.dy === sy) return Number(d) as Dir;
    return 2;
}

/** Avatar kijkt naar de camera (voorkant) of ervan af (rug). */
export const isFrontDir = (d: Dir) => d >= 1 && d <= 5;
/** Avatar kijkt naar rechts op het scherm (anders gespiegeld tekenen). */
export const isRightDir = (d: Dir) => d <= 3;

/** Ligt punt (px, py) binnen de ruit van tegel (x, y) op hoogte z? */
export function pointInTile(
    px: number,
    py: number,
    x: number,
    y: number,
    z: number,
) {
    const c = iso(x + 0.5, y + 0.5, z);
    return (
        Math.abs(px - c.x) / (TILE_W / 2) + Math.abs(py - c.y) / (TILE_H / 2) <=
        1
    );
}

/** Kleur lichter (amt > 0) of donkerder (amt < 0) maken. */
export function shade(hex: string, amt: number) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c: number) =>
        Math.max(
            0,
            Math.min(
                255,
                Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt),
            ),
        );
    const r = f(n >> 16);
    const g = f((n >> 8) & 255);
    const b = f(n & 255);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
