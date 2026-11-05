import { populate } from "./obstacles";
import type { PopulateState, TrackObject } from "./obstacles";

/**
 * Wave Rush — de waterbaan: een eindeloze rij segmenten met bochten (`curve`) en
 * golven (`y1` → `y2`), procedureel gegenereerd met een seed. Hoe verder je komt,
 * hoe scherper de bochten, hoe hoger de golven en hoe meer obstakels.
 * Puur (geen canvas): getest in track.test.ts.
 */

/** Lengte van één segment in wereld-eenheden. */
export const SEGMENT_LENGTH = 200;
/** Eén segment is zoveel meter (afstand en score). */
export const METRES_PER_SEGMENT = 4;
export const UNITS_PER_METRE = SEGMENT_LENGTH / METRES_PER_SEGMENT;
/** Na zoveel segmenten (10 km) is de baan op z'n moeilijkst. */
export const MAX_DIFFICULTY_SEGMENT = 2500;
/** De eerste segmenten zijn rustig: rechtdoor, geen obstakels. */
export const GRACE_SEGMENTS = 60;

export interface Segment {
    index: number;
    /** Bocht: hoeveel de baan per segment opzij buigt (negatief = links). */
    curve: number;
    /** Hoogte van het water aan het begin en eind van het segment. */
    y1: number;
    y2: number;
    objects: TrackObject[];
}

/** 0 aan de start, 1 vanaf MAX_DIFFICULTY_SEGMENT. */
export const difficultyAt = (segment: number) =>
    Math.min(1, Math.max(0, segment / MAX_DIFFICULTY_SEGMENT));

/** Kleine, snelle seeded random (mulberry32): dezelfde seed geeft dezelfde baan. */
export function seededRandom(seed: number): () => number {
    let a = seed >>> 0;

    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const easeIn = (a: number, b: number, p: number) => a + (b - a) * p * p;
const easeInOut = (a: number, b: number, p: number) =>
    a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);

export class Track {
    private segments: Segment[] = [];
    /** Index van segments[0] (oude segmenten achter de speler worden opgeruimd). */
    private first = 0;
    private random: () => number;
    private lastY = 0;
    private objectState: PopulateState;

    constructor(seed: number) {
        this.random = seededRandom(seed);
        this.objectState = {
            nextId: 1,
            lastBoost: -Infinity,
            lastRamp: -Infinity,
            coinRun: null,
        };
        // Rustige start: rechtdoor
        this.addPiece(0, GRACE_SEGMENTS, 0, 0, 0);
    }

    /** Segment `i` (genereert de baan zo ver als nodig). */
    get(i: number): Segment {
        while (this.first + this.segments.length <= i) this.generate();
        return this.segments[Math.max(0, i - this.first)];
    }

    /** Segmenten vóór `index` mogen weg (ze liggen achter de camera). */
    prune(index: number) {
        const drop = Math.min(index - this.first, this.segments.length - 1);
        if (drop > 200) {
            this.segments.splice(0, drop);
            this.first += drop;
        }
    }

    private get length() {
        return this.first + this.segments.length;
    }

    /** Volgend stuk baan: rechtdoor, een bocht, een golf of een reeks rollers. */
    private generate() {
        const r = this.random;
        const d = difficultyAt(this.length);
        const len = (min: number, max: number) =>
            Math.round(min + r() * (max - min));
        const side = r() < 0.5 ? -1 : 1;
        const curve = side * (1 + r() * (1.5 + 4 * d));
        const swell = (r() < 0.5 ? -1 : 1) * (300 + r() * (500 + 1700 * d));
        const pick = r();

        if (pick < 0.2 - 0.1 * d) {
            this.addPiece(0, len(20, 50), 0, 0, 0);
        } else if (pick < 0.55) {
            this.addPiece(len(8, 20), len(15, 45), len(8, 20), curve, 0);
        } else if (pick < 0.8) {
            this.addPiece(
                len(10, 20),
                len(10, 30),
                len(10, 20),
                r() < 0.5 ? curve * 0.6 : 0,
                swell,
            );
        } else {
            this.addRollers(len(3, 5), 260 + 600 * d);
        }
    }

    /** Stuk baan: bocht/golf in (`enter`), vasthouden (`hold`) en weer uit (`leave`). */
    private addPiece(
        enter: number,
        hold: number,
        leave: number,
        curve: number,
        dy: number,
    ) {
        const startY = this.lastY;
        const total = enter + hold + leave;
        for (let n = 0; n < total; n++) {
            const c =
                n < enter
                    ? easeIn(0, curve, n / enter)
                    : n < enter + hold
                      ? curve
                      : easeInOut(curve, 0, (n - enter - hold) / leave);
            this.push(c, easeInOut(startY, startY + dy, (n + 1) / total));
        }
    }

    /** Reeks korte golven achter elkaar (de baan blijft daarna op dezelfde hoogte). */
    private addRollers(count: number, height: number) {
        const startY = this.lastY;
        const per = 12;
        for (let n = 0; n < count * per; n++) {
            this.push(
                0,
                startY + Math.sin(((n + 1) / per) * Math.PI) ** 2 * height,
            );
        }
    }

    private push(curve: number, y2: number) {
        const index = this.length;
        const segment: Segment = {
            index,
            curve,
            y1: this.lastY,
            y2,
            objects: [],
        };
        segment.objects = populate(
            index,
            difficultyAt(index),
            this.random,
            this.objectState,
            GRACE_SEGMENTS,
        );
        this.segments.push(segment);
        this.lastY = y2;
    }
}
