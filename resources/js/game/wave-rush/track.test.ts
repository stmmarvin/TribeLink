import { describe, expect, it } from "vite-plus/test";
import {
    BOOST_SPACING,
    GATE_SPACING,
    MARKER_OFFSET,
    MARKER_SPACING,
    RAMP_SPACING,
    isDecor,
} from "./obstacles";
import type { ObjectKind } from "./obstacles";
import {
    GRACE_SEGMENTS,
    METRES_PER_SEGMENT,
    Track,
    difficultyAt,
    seededRandom,
} from "./track";

const OBSTACLES: ObjectKind[] = ["buoy", "driftwood", "rock", "boat"];

/** Segmenten [from, to) van een baan. */
function range(track: Track, from: number, to: number) {
    return Array.from({ length: to - from }, (_, i) => track.get(from + i));
}

describe("track generation", () => {
    it("builds the same track for the same seed", () => {
        const a = range(new Track(42), 0, 800);
        const b = range(new Track(42), 0, 800);

        expect(
            a.map((s) => [s.curve, s.y2, s.objects.map((o) => o.kind)]),
        ).toEqual(b.map((s) => [s.curve, s.y2, s.objects.map((o) => o.kind)]));
    });

    it("builds a different track for another seed", () => {
        const a = range(new Track(1), 0, 800).map((s) => s.curve);
        const b = range(new Track(2), 0, 800).map((s) => s.curve);

        expect(a).not.toEqual(b);
    });

    it("is one continuous surface: every segment starts where the last one ended", () => {
        const segments = range(new Track(7), 0, 3000);

        segments.slice(1).forEach((s, i) => {
            expect(s.y1).toBe(segments[i].y2);
            expect(s.index).toBe(i + 1);
        });
    });

    it("starts with a calm, straight stretch without obstacles", () => {
        const start = range(new Track(3), 0, GRACE_SEGMENTS);

        expect(start.every((s) => s.curve === 0 && s.y2 === 0)).toBe(true);
        expect(
            start
                .flatMap((s) => s.objects)
                .some((o) => OBSTACLES.includes(o.kind)),
        ).toBe(false);
    });

    it("gets harder further on: sharper curves, bigger waves, more obstacles", () => {
        const track = new Track(11);
        const early = range(track, GRACE_SEGMENTS, 1000);
        const late = range(track, 2500, 3440);
        const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
        const obstacles = (ss: typeof early) =>
            ss
                .flatMap((s) => s.objects)
                .filter((o) => OBSTACLES.includes(o.kind)).length;

        expect(avg(late.map((s) => Math.abs(s.curve)))).toBeGreaterThan(
            avg(early.map((s) => Math.abs(s.curve))),
        );
        const slope = (ss: typeof early) =>
            avg(ss.map((s) => Math.abs(s.y2 - s.y1)));
        expect(slope(late)).toBeGreaterThan(slope(early));
        expect(obstacles(late)).toBeGreaterThan(obstacles(early));
    });

    it("keeps boosts and ramps far enough apart for the server check", () => {
        const segments = range(new Track(5), 0, 4000);
        const where = (kind: ObjectKind) =>
            segments
                .filter((s) => s.objects.some((o) => o.kind === kind))
                .map((s) => s.index);
        const gaps = (xs: number[]) => xs.slice(1).map((x, i) => x - xs[i]);

        expect(where("boost").length).toBeGreaterThan(0);
        expect(where("ramp").length).toBeGreaterThan(0);
        expect(Math.min(...gaps(where("boost")))).toBeGreaterThanOrEqual(
            BOOST_SPACING,
        );
        expect(Math.min(...gaps(where("ramp")))).toBeGreaterThanOrEqual(
            RAMP_SPACING,
        );
        // config/arcade.php: boost 120 m, ramp 150 m
        expect(BOOST_SPACING * METRES_PER_SEGMENT).toBeGreaterThanOrEqual(120);
        expect(RAMP_SPACING * METRES_PER_SEGMENT).toBeGreaterThanOrEqual(150);
    });

    it("puts at most one coin on a segment (4 m apart)", () => {
        const segments = range(new Track(9), 0, 3000);

        for (const s of segments) {
            expect(
                s.objects.filter((o) => o.kind === "coin").length,
            ).toBeLessThanOrEqual(1);
        }
    });

    it("keeps obstacles and pick-ups on the course and the scenery off it", () => {
        const objects = range(new Track(13), 0, 3000).flatMap((s) => s.objects);
        const play = objects.filter(
            (o) => !isDecor(o.kind) && o.kind !== "gate",
        );
        const scenery = objects.filter(
            (o) => isDecor(o.kind) && o.kind !== "marker",
        );

        expect(play.every((o) => Math.abs(o.offset) <= 0.85)).toBe(true);
        expect(scenery.length).toBeGreaterThan(0);
        expect(scenery.every((o) => Math.abs(o.offset) >= 1.8)).toBe(true);
    });

    it("marks the course with buoys on both sides", () => {
        const segments = range(new Track(17), 0, 300);

        for (const s of segments) {
            const markers = s.objects
                .filter((o) => o.kind === "marker")
                .map((o) => o.offset);
            expect(markers).toEqual(
                s.index % MARKER_SPACING === 0
                    ? [-MARKER_OFFSET, MARKER_OFFSET]
                    : [],
            );
        }
    });

    it("puts a checkpoint gate across the course every 600 m, with nothing else in it", () => {
        const segments = range(new Track(19), 0, 1000);
        const gates = segments.filter((s) =>
            s.objects.some((o) => o.kind === "gate"),
        );

        expect(gates.map((s) => s.index)).toEqual([
            150, 300, 450, 600, 750, 900,
        ]);
        expect(GATE_SPACING * METRES_PER_SEGMENT).toBe(600);
        for (const s of gates) {
            expect(
                s.objects.filter((o) => !isDecor(o.kind)).map((o) => o.kind),
            ).toEqual(["gate"]);
        }
    });

    it("still returns segments after old ones are pruned", () => {
        const track = new Track(21);
        const before = track.get(1500).curve;
        track.prune(1400);

        expect(track.get(1500).curve).toBe(before);
        expect(track.get(1600).index).toBe(1600);
    });
});

describe("difficulty and randomness", () => {
    it("ramps difficulty from 0 to 1", () => {
        expect(difficultyAt(0)).toBe(0);
        expect(difficultyAt(1250)).toBeCloseTo(0.5);
        expect(difficultyAt(100_000)).toBe(1);
    });

    it("gives numbers between 0 and 1", () => {
        const random = seededRandom(99);
        const values = Array.from({ length: 1000 }, random);

        expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...values)).toBeLessThan(1);
    });
});
