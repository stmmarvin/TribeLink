import { describe, expect, it } from "vite-plus/test";
import { PLAYER_WIDTH, collide, overlaps } from "./collision";
import type { Rider } from "./collision";
import type { ObjectKind, TrackObject } from "./obstacles";
import {
    BUMP_SPEED_LOSS,
    CRASH_SPEED_LOSS,
    LIVES,
    POINTS,
    START_TIME,
    applyEffect,
    gateTime,
    newPlayer,
    scoreOf,
    updatePlayer,
} from "./player";

const rider = (overrides: Partial<Rider> = {}): Rider => ({
    x: 0,
    airborne: false,
    invulnerable: false,
    ...overrides,
});
const object = (kind: ObjectKind, offset = 0): TrackObject => ({
    id: 1,
    kind,
    offset,
});
const still = { steer: 0, boost: false };

describe("overlaps", () => {
    it("measures across the course, using both widths", () => {
        expect(overlaps(0, 0.2, 0.19, 0.2)).toBe(true);
        expect(overlaps(0, 0.2, 0.21, 0.2)).toBe(false);
        expect(overlaps(-0.5, 0.2, -0.6, 0.2)).toBe(true);
    });
});

describe("collide", () => {
    it("misses what is not in your lane", () => {
        expect(collide(rider({ x: -0.8 }), object("rock", 0.8))).toBeNull();
        expect(collide(rider(), object("buoy", PLAYER_WIDTH))).toBeNull();
    });

    it("never hits something twice", () => {
        expect(collide(rider(), { ...object("rock"), taken: true })).toBeNull();
    });

    it("never hits the course markers or the scenery", () => {
        for (const kind of [
            "marker",
            "island",
            "palm",
            "cliff",
            "beach",
            "harbor",
        ] as const) {
            expect(collide(rider({ x: 0 }), object(kind, 0))).toBeNull();
        }
    });

    it("picks up coins and boosts, also in the air", () => {
        expect(collide(rider(), object("coin"))).toBe("coin");
        expect(collide(rider({ airborne: true }), object("coin"))).toBe("coin");
        expect(collide(rider(), object("boost"))).toBe("boost");
    });

    it("counts a checkpoint only between the posts", () => {
        expect(collide(rider({ x: 0.9 }), object("gate"))).toBe("gate");
        expect(collide(rider({ airborne: true }), object("gate"))).toBe("gate");
        expect(collide(rider({ x: 1.2 }), object("gate"))).toBeNull();
    });

    it("launches you off a wave ramp, unless you are already flying", () => {
        expect(collide(rider(), object("ramp"))).toBe("ramp");
        expect(collide(rider({ airborne: true }), object("ramp"))).toBeNull();
    });

    it("flies over obstacles and ignores them right after a hit", () => {
        expect(collide(rider({ airborne: true }), object("rock"))).toBeNull();
        expect(
            collide(rider({ invulnerable: true }), object("boat")),
        ).toBeNull();
    });

    it("bumps on soft obstacles and crashes on hard ones", () => {
        expect(collide(rider(), object("buoy"))).toBe("bump");
        expect(collide(rider(), object("driftwood"))).toBe("bump");
        expect(collide(rider(), object("rock"))).toBe("crash");
        expect(collide(rider(), object("boat"))).toBe("crash");
    });
});

describe("effects on the player", () => {
    it("costs a life only on a hard crash", () => {
        const p = newPlayer();
        applyEffect(p, "bump");
        expect(p.lives).toBe(LIVES);

        for (let i = 0; i < LIVES + 1; i++) applyEffect(p, "crash");
        expect(p.lives).toBe(0);
    });

    it("only costs speed on a hit: there is no instant game over", () => {
        const bumped = { ...newPlayer(), speed: 40 };
        const crashed = { ...newPlayer(), speed: 40 };
        applyEffect(bumped, "bump");
        applyEffect(crashed, "crash");

        expect(bumped.speed).toBeCloseTo(40 * (1 - BUMP_SPEED_LOSS));
        expect(crashed.speed).toBeCloseTo(40 * (1 - CRASH_SPEED_LOSS));
        expect(crashed.invulnerable).toBeGreaterThan(0);
        expect(updatePlayer(crashed, still, 0.016, 0, 0)).toBeNull();
    });

    it("adds time at a checkpoint, less when the track gets harder", () => {
        const p = newPlayer();
        applyEffect(p, "gate", 0);

        expect(p.time).toBe(START_TIME + gateTime(0));
        expect(p.gates).toBe(1);
        expect(gateTime(1)).toBeLessThan(gateTime(0));
    });

    it("is game over when the time runs out", () => {
        const p = newPlayer();

        expect(updatePlayer(p, still, START_TIME - 1, 0, 0)).toBeNull();
        expect(updatePlayer(p, still, 1.5, 0, 0)).toBe("timeup");
        expect(p.time).toBe(0);
    });

    it("fills the boost meter, but never beyond full", () => {
        const p = newPlayer();
        applyEffect(p, "boost");
        applyEffect(p, "boost");
        applyEffect(p, "boost");

        expect(p.boost).toBe(1);
        expect(p.boosts).toBe(3);
    });

    it("counts a trick when you steer both ways during a jump", () => {
        const p = newPlayer();
        applyEffect(p, "ramp");
        updatePlayer(p, { steer: -1, boost: false }, 0.3, 0, 0);
        updatePlayer(p, { steer: 1, boost: false }, 0.3, 0, 0);

        expect(updatePlayer(p, still, 0.5, 0, 0)).toBe("trick");
        expect(p.tricks).toBe(1);
    });

    it("just lands after a plain jump", () => {
        const p = newPlayer();
        applyEffect(p, "ramp");
        updatePlayer(p, { steer: 1, boost: false }, 0.5, 0, 0);

        expect(updatePlayer(p, { steer: 1, boost: false }, 0.5, 0, 0)).toBe(
            "land",
        );
        expect(p.tricks).toBe(0);
    });

    it("scores whole metres plus the bonuses, like the server", () => {
        const p = {
            ...newPlayer(),
            distance: 1234.9,
            coins: 3,
            boosts: 2,
            tricks: 1,
            gates: 4,
        };

        expect(scoreOf(p)).toBe(
            1234 + 3 * POINTS.coin + 2 * POINTS.boost + POINTS.trick,
        );
    });
});
