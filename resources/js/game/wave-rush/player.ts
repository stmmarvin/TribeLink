import type { Effect } from "./collision";

/**
 * Wave Rush — de jetski: sturen, snelheid, boost, sprongen en tricks, de klok
 * (checkpoints geven extra tijd), de levens (tijd of levens op = game over) en de score. Puur (geen
 * canvas); de engine roept updatePlayer elk frame aan.
 */

/** Snelheden in meter per seconde. De topsnelheid loopt op met de moeilijkheid. */
export const BASE_MAX_SPEED = 40;
export const MAX_SPEED_GAIN = 18;
/** Met boost (de server staat iets meer toe: config/arcade.php → max_speed_mps). */
export const BOOST_SPEED = 80;
/** Buiten de boeienlijn (het woeste water) ga je niet harder dan dit. */
export const OFF_COURSE_SPEED = 20;
const ACCEL = 12;
const BOOST_ACCEL = 40;
const DECEL = 18;

/** Zijwaarts sturen (baanbreedtes per seconde) en hoe hard een bocht je naar buiten duwt. */
const STEER = 1.9;
const CENTRIFUGAL = 0.32;

/** Starttijd en wat een checkpoint erbij geeft (minder naarmate de baan moeilijker wordt). */
export const START_TIME = 60;
export const gateTime = (difficulty: number) => Math.round(24 - 8 * difficulty);

/** Levens: een rots of boot raken kost er één (en vaart). Op = game over, net als tijd op. */
export const LIVES = 3;

/** Botsingen kosten vaart: een boei/wrakhout een beetje, een rots/boot veel. */
export const BUMP_SPEED_LOSS = 0.25;
export const CRASH_SPEED_LOSS = 0.6;
/** Na een botsing even onkwetsbaar (en zolang schudt de jetski). */
export const INVULNERABLE_S = 0.8;

/** Boost-meter (0–1): een pick-up vult hem half, boosten leegt hem in 2,5 s. */
export const BOOST_PICKUP = 0.5;
const BOOST_DRAIN = 0.4;

/** Een schans (golf) gooit je zo lang de lucht in. */
export const JUMP_S = 0.95;

/** Bonuspunten (config/arcade.php → wave-rush.points). */
export const POINTS = { coin: 25, boost: 10, trick: 150 };

export interface PlayerState {
    /** Dwars op de baan: -1 linkerboei, 1 rechterboei (verder = buiten de baan). */
    x: number;
    /** m/s */
    speed: number;
    boost: number;
    boosting: boolean;
    /** Seconden op de klok. */
    time: number;
    lives: number;
    /** Seconden onkwetsbaar (en schudden) na een botsing. */
    invulnerable: number;
    /** Seconden nog in de lucht (0 = op het water). */
    air: number;
    /** Stuurrichtingen tijdens deze sprong: links én rechts = een spin (trick). */
    airSteer: { left: boolean; right: boolean };
    /** Kantelen in bochten (-1 … 1). */
    tilt: number;
    /** Afgelegde afstand in meter. */
    distance: number;
    coins: number;
    boosts: number;
    tricks: number;
    gates: number;
}

export interface PlayerInput {
    /** -1 links, 0 rechtdoor, 1 rechts. */
    steer: number;
    boost: boolean;
}

export function newPlayer(): PlayerState {
    return {
        x: 0,
        speed: 0,
        boost: 0,
        boosting: false,
        time: START_TIME,
        lives: LIVES,
        invulnerable: 0,
        air: 0,
        airSteer: { left: false, right: false },
        tilt: 0,
        distance: 0,
        coins: 0,
        boosts: 0,
        tricks: 0,
        gates: 0,
    };
}

export const maxSpeedFor = (difficulty: number) =>
    BASE_MAX_SPEED + MAX_SPEED_GAIN * difficulty;

/** Score = meters + bonussen; precies zo rekent de server het na (App\Arcade\WaveRushRules). */
export function scoreOf(p: PlayerState) {
    const s = statsOf(p);
    return (
        s.distance +
        s.coins * POINTS.coin +
        s.boosts * POINTS.boost +
        s.tricks * POINTS.trick
    );
}

/** Wat de server krijgt (checkpoints leveren tijd op, geen punten). */
export function statsOf(p: PlayerState) {
    return {
        distance: Math.floor(p.distance),
        coins: p.coins,
        boosts: p.boosts,
        tricks: p.tricks,
    };
}

export const isAirborne = (p: PlayerState) => p.air > 0;

/**
 * Eén stap: klok, snelheid, sturen, bocht-kracht, boost, sprong. Geeft terug wat
 * er gebeurde: `'timeup'` (game over), `'trick'` (geland na een spin), `'land'`
 * (gewoon geland) of null.
 */
export function updatePlayer(
    p: PlayerState,
    input: PlayerInput,
    dt: number,
    curve: number,
    difficulty: number,
): "timeup" | "trick" | "land" | null {
    p.time = Math.max(0, p.time - dt);
    if (p.time === 0) return "timeup";

    const max = maxSpeedFor(difficulty);
    const offCourse = Math.abs(p.x) > 1;

    p.boosting = input.boost && p.boost > 0;
    if (p.boosting) {
        p.boost = Math.max(0, p.boost - BOOST_DRAIN * dt);
        p.speed = Math.min(BOOST_SPEED, p.speed + BOOST_ACCEL * dt);
    } else {
        const target = offCourse ? Math.min(max, OFF_COURSE_SPEED) : max;
        p.speed =
            p.speed < target
                ? Math.min(target, p.speed + ACCEL * dt)
                : Math.max(target, p.speed - DECEL * dt);
    }

    const ratio = Math.min(1, p.speed / max);
    // In de lucht kun je nog een beetje bijsturen
    const grip = p.air > 0 ? 0.35 : 1;
    p.x += input.steer * STEER * ratio * grip * dt;
    p.x -= curve * CENTRIFUGAL * ratio * ratio * dt;
    p.x = Math.max(-2, Math.min(2, p.x));
    p.tilt += (input.steer - p.tilt) * Math.min(1, dt * 8);

    p.distance += p.speed * dt;
    p.invulnerable = Math.max(0, p.invulnerable - dt);

    if (p.air > 0) {
        if (input.steer < 0) p.airSteer.left = true;
        if (input.steer > 0) p.airSteer.right = true;
        p.air = Math.max(0, p.air - dt);
        if (p.air === 0) {
            if (p.airSteer.left && p.airSteer.right) {
                p.tricks++;
                return "trick";
            }
            return "land";
        }
    }

    return null;
}

/** Gevolg van een botsing, pick-up of checkpoint. */
export function applyEffect(p: PlayerState, effect: Effect, difficulty = 0) {
    switch (effect) {
        case "coin":
            p.coins++;
            break;
        case "boost":
            p.boosts++;
            p.boost = Math.min(1, p.boost + BOOST_PICKUP);
            break;
        case "gate":
            p.gates++;
            p.time += gateTime(difficulty);
            break;
        case "ramp":
            p.air = JUMP_S;
            p.airSteer = { left: false, right: false };
            break;
        case "bump":
            p.speed *= 1 - BUMP_SPEED_LOSS;
            p.invulnerable = INVULNERABLE_S / 2;
            break;
        case "crash":
            p.lives = Math.max(0, p.lives - 1);
            p.speed *= 1 - CRASH_SPEED_LOSS;
            p.invulnerable = INVULNERABLE_S;
            break;
    }
}
