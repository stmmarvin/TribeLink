import { describe, expect, it } from "vite-plus/test";
import {
    BASE_SIZE,
    EMPTY_STATS,
    GROW_EVERY,
    MAX_PERFECT_BONUS,
    MAX_SPEED,
    SLIDE_RANGE,
    axisFor,
    drop,
    grow,
    score,
    shouldGrow,
    slide,
    spawn,
    speedFor,
} from "./logic";
import type { Rect } from "./logic";

const base: Rect = { x: 0, y: 0, w: 10, d: 10 };

describe("drop", () => {
    it("cuts off the part that hangs over on the right", () => {
        const result = drop({ x: 3, y: 0, w: 10, d: 10 }, base, "x");

        expect(result).toEqual({
            kind: "cut",
            placed: { x: 3, y: 0, w: 7, d: 10 },
            debris: { x: 10, y: 0, w: 3, d: 10 },
        });
    });

    it("cuts off the part that hangs over on the left", () => {
        const result = drop({ x: -4, y: 0, w: 10, d: 10 }, base, "x");

        expect(result).toEqual({
            kind: "cut",
            placed: { x: 0, y: 0, w: 6, d: 10 },
            debris: { x: -4, y: 0, w: 4, d: 10 },
        });
    });

    it("only cuts along the axis the block slides on", () => {
        const below = { x: 2, y: 0, w: 6, d: 10 };
        const result = drop({ x: 2, y: 2.5, w: 6, d: 10 }, below, "y");

        expect(result).toEqual({
            kind: "cut",
            placed: { x: 2, y: 2.5, w: 6, d: 7.5 },
            debris: { x: 2, y: 10, w: 6, d: 2.5 },
        });
    });

    it("keeps placed + debris exactly as big as the moving block", () => {
        const moving = { x: 0, y: -3.7, w: 10, d: 10 };
        const result = drop(moving, base, "y");

        expect(result.kind).toBe("cut");
        if (result.kind === "cut") {
            expect(result.placed.d + result.debris.d).toBeCloseTo(moving.d);
        }
    });

    it("is a perfect drop within the tolerance, snapped onto the layer below", () => {
        const result = drop({ x: 0.2, y: 0, w: 10, d: 10 }, base, "x");

        expect(result).toEqual({ kind: "perfect", placed: base });
    });

    it("is a miss when the block does not overlap at all", () => {
        const moving = { x: 10, y: 0, w: 10, d: 10 };

        expect(drop(moving, base, "x")).toEqual({
            kind: "miss",
            debris: moving,
        });
        expect(drop({ ...moving, x: -12 }, base, "x").kind).toBe("miss");
    });
});

describe("score", () => {
    const cut = drop({ x: 3, y: 0, w: 10, d: 10 }, base, "x");
    const perfect = drop(base, base, "x");
    const miss = drop({ x: 20, y: 0, w: 10, d: 10 }, base, "x");

    it("gives one point per placed block", () => {
        expect(score(EMPTY_STATS, cut)).toEqual({
            blocks: 1,
            perfects: 0,
            combo: 0,
            score: 1,
        });
    });

    it("adds a growing combo bonus for perfect drops, up to the maximum", () => {
        let stats = EMPTY_STATS;
        const scores: number[] = [];

        for (let i = 0; i < 5; i++) {
            stats = score(stats, perfect);
            scores.push(stats.score);
        }

        // 1 + 1, 1 + 2, 1 + 3, 1 + 3, 1 + 3
        expect(scores).toEqual([2, 5, 9, 13, 17]);
        expect(stats).toMatchObject({ blocks: 5, perfects: 5, combo: 5 });
    });

    it("resets the combo after a cut", () => {
        const stats = score(score(score(EMPTY_STATS, perfect), perfect), cut);

        expect(stats.combo).toBe(0);
        expect(stats.blocks).toBe(3);
    });

    it("does not change on a miss", () => {
        const stats = score(EMPTY_STATS, perfect);

        expect(score(stats, miss)).toBe(stats);
    });

    it("never exceeds what the server accepts", () => {
        let stats = EMPTY_STATS;

        for (let i = 0; i < 40; i++) {
            stats = score(stats, i % 7 === 0 ? cut : perfect);
        }

        expect(stats.score).toBeGreaterThanOrEqual(stats.blocks);
        expect(stats.score).toBeLessThanOrEqual(
            stats.blocks + stats.perfects * MAX_PERFECT_BONUS,
        );
    });
});

describe("grow", () => {
    it("grows from the centre", () => {
        expect(grow({ x: 2, y: 3, w: 4, d: 6 }, 1)).toEqual({
            x: 1.5,
            y: 2.5,
            w: 5,
            d: 7,
        });
    });

    it("never grows beyond the base size", () => {
        const r = grow({ x: 0, y: 0, w: BASE_SIZE - 0.2, d: BASE_SIZE }, 1);

        expect(r.w).toBe(BASE_SIZE);
        expect(r.d).toBe(BASE_SIZE);
    });

    it("happens after every few perfects in a row", () => {
        expect(shouldGrow(0)).toBe(false);
        expect(shouldGrow(GROW_EVERY - 1)).toBe(false);
        expect(shouldGrow(GROW_EVERY)).toBe(true);
        expect(shouldGrow(GROW_EVERY * 2)).toBe(true);
    });
});

describe("moving block", () => {
    it("alternates the axis per layer", () => {
        expect([0, 1, 2, 3].map(axisFor)).toEqual(["x", "y", "x", "y"]);
    });

    it("spawns next to the layer below with the same size", () => {
        const below = { x: 1, y: 2, w: 6, d: 8 };

        expect(spawn(below, "x")).toEqual({
            x: 1 - SLIDE_RANGE,
            y: 2,
            w: 6,
            d: 8,
        });
        expect(spawn(below, "y")).toEqual({
            x: 1,
            y: 2 - SLIDE_RANGE,
            w: 6,
            d: 8,
        });
    });

    it("bounces back at the end of its range", () => {
        const moving = { x: SLIDE_RANGE - 1, y: 0, w: 10, d: 10 };
        const { rect, direction } = slide(moving, base, "x", 1, 3);

        expect(rect.x).toBe(SLIDE_RANGE - 2);
        expect(direction).toBe(-1);
    });

    it("speeds up with the height of the tower, up to a maximum", () => {
        expect(speedFor(10)).toBeGreaterThan(speedFor(0));
        expect(speedFor(10_000)).toBe(MAX_SPEED);
    });
});
