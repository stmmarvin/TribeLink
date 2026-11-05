import { HARD, OBJECT_WIDTH, SOFT, isDecor } from "./obstacles";
import type { ObstacleKind, TrackObject } from "./obstacles";

/**
 * Wave Rush — botsingen. Puur: wat er gebeurt als de jetski een object raakt
 * (getest in collision.test.ts). Wat dat met de speler doet staat in player.ts.
 */

/** Breedte van de jetski op de baan (zelfde eenheid als TrackObject.offset). */
export const PLAYER_WIDTH = 0.3;

/**
 * - `coin` / `boost`: oppakken
 * - `ramp`: de lucht in
 * - `gate`: checkpoint, extra tijd
 * - `bump`: een beetje vaart kwijt (boei, wrakhout)
 * - `crash`: veel vaart kwijt (rots, boot)
 */
export type Effect = "coin" | "boost" | "ramp" | "gate" | "bump" | "crash";

export interface Rider {
    x: number;
    airborne: boolean;
    /** Vlak na een botsing ben je even onkwetsbaar (geen dubbele botsing). */
    invulnerable: boolean;
}

/** Raken twee dingen op de baan elkaar (dwars op de baan gemeten)? */
export const overlaps = (ax: number, aw: number, bx: number, bw: number) =>
    Math.abs(ax - bx) < (aw + bw) / 2;

export function collide(rider: Rider, object: TrackObject): Effect | null {
    if (object.taken || isDecor(object.kind)) return null;
    if (
        !overlaps(
            rider.x,
            PLAYER_WIDTH,
            object.offset,
            OBJECT_WIDTH[object.kind],
        )
    )
        return null;

    switch (object.kind) {
        case "coin":
            return "coin";
        case "boost":
            return "boost";
        case "gate":
            // Alleen tussen de palen door, niet ernaast
            return Math.abs(rider.x) <= 1 ? "gate" : null;
        case "ramp":
            return rider.airborne ? null : "ramp";
    }

    // In de lucht vlieg je over obstakels heen
    if (rider.airborne || rider.invulnerable) return null;
    if (SOFT.includes(object.kind as ObstacleKind)) return "bump";
    if (HARD.includes(object.kind as ObstacleKind)) return "crash";

    return null;
}
