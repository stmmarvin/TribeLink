/**
 * Wave Rush — wat er op en langs het water ligt: obstakels (boeien, wrakhout,
 * rotsen, boten), pick-ups (munten, boosts, schansen), checkpoint-poorten, de
 * boeienlijn die de baan afbakent en decor (eilanden, palmen, rotswanden, strand,
 * haventje). Per segment beslist `populate` wat er komt, met vaste minimale
 * afstanden (die controleert de server ook: config/arcade.php).
 */

export type ObstacleKind = "buoy" | "driftwood" | "rock" | "boat";
export type PickupKind = "coin" | "boost" | "ramp" | "gate";
export type DecorKind =
    "marker" | "island" | "palm" | "cliff" | "beach" | "harbor";
export type ObjectKind = ObstacleKind | PickupKind | DecorKind;

export interface TrackObject {
    id: number;
    kind: ObjectKind;
    /** Positie dwars op de baan: -1 = linkerrand, 0 = midden, 1 = rechterrand (decor ligt verder weg). */
    offset: number;
    /** Boten varen langzaam heen en weer (offset per seconde). */
    drift?: number;
    /** Al geraakt of opgepakt. */
    taken?: boolean;
}

/** Breedte (in dezelfde eenheid als `offset`; de baan is 2 breed). */
export const OBJECT_WIDTH: Record<ObjectKind, number> = {
    buoy: 0.18,
    driftwood: 0.45,
    rock: 0.32,
    boat: 0.42,
    coin: 0.16,
    boost: 0.22,
    ramp: 0.5,
    gate: 2.5,
    marker: 0.1,
    island: 3,
    palm: 0.6,
    cliff: 1.4,
    beach: 2.6,
    harbor: 2,
};

/** Zachte obstakels kosten een beetje vaart, harde veel. */
export const SOFT: ObstacleKind[] = ["buoy", "driftwood"];
export const HARD: ObstacleKind[] = ["rock", "boat"];
/** Decor raak je nooit: het ligt buiten de baan of is alleen een markering. */
export const DECOR: DecorKind[] = [
    "marker",
    "island",
    "palm",
    "cliff",
    "beach",
    "harbor",
];
export const isDecor = (kind: ObjectKind) =>
    (DECOR as ObjectKind[]).includes(kind);

/** Minimaal zoveel segmenten tussen twee boosts / schansen (× 4 m ≥ config/arcade.php). */
export const BOOST_SPACING = 32;
export const RAMP_SPACING = 40;
/** Om de zoveel segmenten (600 m) een checkpoint-poort. */
export const GATE_SPACING = 150;
/** Boeienlijn: om de zoveel segmenten links en rechts een boei, net buiten de baan. */
export const MARKER_SPACING = 3;
export const MARKER_OFFSET = 1.15;
/** Munten liggen in rijtjes, hooguit één per segment (4 m). */
export const COIN_RUN = { min: 6, max: 12 };

export interface PopulateState {
    nextId: number;
    lastBoost: number;
    lastRamp: number;
    coinRun: { offset: number; left: number } | null;
}

/** Wat er op segment `index` ligt (muteert `state` voor de afstanden tussen dingen). */
export function populate(
    index: number,
    difficulty: number,
    random: () => number,
    state: PopulateState,
    /** Tot dit segment (track.ts → GRACE_SEGMENTS) geen obstakels. */
    grace: number,
): TrackObject[] {
    const objects: TrackObject[] = [];
    const add = (kind: ObjectKind, offset: number, drift?: number) =>
        objects.push({ id: state.nextId++, kind, offset, drift });
    const lane = () => (random() * 2 - 1) * 0.75;
    const side = () => (random() < 0.5 ? -1 : 1);

    // Boeienlijn en decor: altijd, ook in de rustige start
    if (index % MARKER_SPACING === 0) {
        add("marker", -MARKER_OFFSET);
        add("marker", MARKER_OFFSET);
    }
    const scenery = random();
    if (scenery < 0.004) add("harbor", side() * (4 + random() * 3));
    else if (scenery < 0.03) add("island", side() * (4 + random() * 4));
    else if (scenery < 0.05) add("palm", side() * (1.8 + random() * 1.5));
    else if (scenery < 0.065) add("cliff", side() * (2.5 + random() * 2));
    else if (scenery < 0.075) add("beach", side() * (3.5 + random() * 2));

    if (index > 0 && index % GATE_SPACING === 0) {
        add("gate", 0);
        return objects;
    }

    // Muntenrij: begint af en toe, ligt dan een paar segmenten in dezelfde baan
    if (!state.coinRun && random() < 0.035) {
        const length =
            COIN_RUN.min +
            Math.floor(random() * (COIN_RUN.max - COIN_RUN.min + 1));
        state.coinRun = { offset: lane(), left: length };
    }
    if (state.coinRun) {
        add("coin", state.coinRun.offset);
        state.coinRun.left--;
        if (state.coinRun.left <= 0) state.coinRun = null;
    }

    if (index < grace) {
        return objects;
    }

    const busy = (offset: number) =>
        objects.some(
            (o) => !isDecor(o.kind) && Math.abs(o.offset - offset) < 0.45,
        );

    if (
        index - state.lastRamp >= RAMP_SPACING &&
        random() < 0.02 + 0.02 * difficulty
    ) {
        const offset = lane() * 0.8;
        if (!busy(offset)) {
            add("ramp", offset);
            state.lastRamp = index;
            return objects;
        }
    }

    if (index - state.lastBoost >= BOOST_SPACING && random() < 0.018) {
        const offset = lane();
        if (!busy(offset)) {
            add("boost", offset);
            state.lastBoost = index;
        }
    }

    // Obstakels: vaker en gevaarlijker naarmate de baan moeilijker wordt
    if (random() < 0.035 + 0.11 * difficulty) {
        const offset = lane();
        if (!busy(offset)) {
            const hardChance = 0.15 + 0.45 * difficulty;
            if (random() < hardChance) {
                if (random() < 0.4)
                    add("boat", offset, side() * (0.15 + 0.25 * difficulty));
                else add("rock", offset);
            } else {
                add(random() < 0.6 ? "buoy" : "driftwood", offset);
            }
        }
    }

    return objects;
}

/** Boten een stukje verder laten varen; ze keren om bij de rand van de baan. */
export function moveBoat(object: TrackObject, dt: number) {
    if (!object.drift) return;
    object.offset += object.drift * dt;
    if (Math.abs(object.offset) > 0.85) {
        object.offset = Math.sign(object.offset) * 0.85;
        object.drift = -object.drift;
    }
}
