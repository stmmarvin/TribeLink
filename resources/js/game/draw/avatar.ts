import { isFrontDir, isRightDir, shade } from "../iso";
import type { AvatarLook, Dir } from "../types";

/** Eén "pixel" van de avatar = 2 schermpixels (bij zoom 1). */
const U = 2;
const OUTLINE = "#141a2e";

/** Hoogte van de kruin boven de voeten (px), voor ballonnen en naamlabels. */
export const AVATAR_HEAD = 72;

export type AvatarPose = {
    dir: Dir;
    /** 0–3 tijdens lopen, anders -1. */
    walkFrame: number;
    sitting: boolean;
    waving: boolean;
    /** 0–3 tijdens dansen, anders -1. */
    danceFrame: number;
};

export type Rect = [x: number, y: number, w: number, h: number, color: string];

/**
 * Bouwt de avatar op uit rechthoeken in "avatar-pixels" (oorsprong = tussen de voeten, y omhoog negatief).
 * Getekend als 3/4-aanzicht naar rechts; voor links wordt gespiegeld.
 */
function buildRects(look: AvatarLook, pose: AvatarPose): Rect[] {
    const front = isFrontDir(pose.dir);
    const r: Rect[] = [];
    const add = (x: number, y: number, w: number, h: number, c: string) =>
        r.push([x, y, w, h, c]);

    const skinD = shade(look.skin, -0.18);
    const shirtD = shade(look.shirt, -0.22);
    const pantsD = shade(look.pants, -0.22);

    const walking = pose.walkFrame >= 0 && !pose.sitting;
    const step = walking ? [0, 1, 0, -1][pose.walkFrame] : 0;
    const dancing = pose.danceFrame >= 0 && !walking;
    const lift = dancing ? [0, -1, -2, -1][pose.danceFrame] : 0;

    // Heupen: bovenkant van de benen = onderkant van de romp
    const hip = (pose.sitting ? -1 : -12) + lift;
    const head = hip - 23;

    // Armen: [achterste arm omhoog, voorste arm omhoog]
    let backUp = false;
    let frontUp = pose.waving;
    if (dancing) {
        backUp = pose.danceFrame < 2;
        frontUp = !backUp;
    }
    const wiggle = pose.waving ? Math.floor(Date.now() / 160) % 2 : 0;
    const arm = (
        x: number,
        up: boolean,
        swing: number,
        c: string,
        hand: string,
    ) => {
        if (up) {
            add(x + wiggle, hip - 20, 2, 9, c);
            add(x + wiggle, hip - 22, 2, 2, hand);
        } else {
            add(x, hip - 11 + swing, 2, 9, c);
            add(x, hip - 2 + swing, 2, 2, hand);
        }
    };

    // 1. achterste arm + lang haar achter de romp
    arm(-7, backUp, step, shirtD, skinD);
    if (look.hairStyle === 1 && front) add(-6, head + 3, 4, 13, look.hair);

    // 2. benen
    if (pose.sitting) {
        if (front) {
            add(-4, hip - 3, 10, 3, look.pants);
            add(3, hip, 3, 4, pantsD);
            add(3, hip + 4, 4, 2, look.shoes);
        } else {
            add(-4, hip - 3, 9, 3, look.pants);
        }
    } else {
        const shoeW = front ? 4 : 3;
        // achterste been (links) en voorste been (rechts) stappen tegengesteld
        const legs: Array<[number, number, string]> = [
            [-4 + step, step > 0 ? 1 : 0, pantsD],
            [1 - step, step < 0 ? 1 : 0, look.pants],
        ];
        for (const [x, up, c] of legs) {
            add(x, hip, 3, 10 - up, c);
            add(x, hip + 10 - up, shoeW, 2, look.shoes);
        }
    }

    // 3. romp
    add(-5, hip - 12, 10, 12, look.shirt);
    add(front ? -5 : 3, hip - 12, 2, 12, shirtD);
    add(-5, hip - 2, 10, 2, pantsD);

    // 4. voorste arm
    arm(5, frontUp, -step, look.shirt, look.skin);

    // 5. hoofd
    add(-1, hip - 13, 3, 1, skinD);
    add(-5, head, 10, 11, look.skin);

    if (front) {
        add(-5, head + 5, 1, 2, skinD); // oor
        add(1, head + 5, 1, 2, OUTLINE); // ogen
        add(4, head + 5, 1, 2, OUTLINE);
        add(2, head + 8, 2, 1, shade(look.skin, -0.35)); // mond
        switch (look.hairStyle) {
            case 0:
                add(-5, head - 1, 10, 4, look.hair);
                add(-5, head + 3, 3, 3, look.hair);
                break;
            case 1:
                add(-6, head - 1, 11, 4, look.hair);
                add(-6, head + 3, 3, 4, look.hair);
                add(4, head + 3, 2, 2, look.hair);
                break;
            case 2:
                add(-6, head - 4, 12, 7, look.hair);
                add(-6, head + 3, 3, 3, look.hair);
                add(-4, head - 5, 3, 1, look.hair);
                add(1, head - 5, 3, 1, look.hair);
                break;
        }
    } else {
        // Achterkant: haar bedekt het hoofd
        switch (look.hairStyle) {
            case 0:
                add(-5, head - 1, 10, 8, look.hair);
                break;
            case 1:
                add(-6, head - 1, 12, 16, look.hair);
                break;
            case 2:
                add(-6, head - 4, 12, 11, look.hair);
                add(-4, head - 5, 3, 1, look.hair);
                add(1, head - 5, 3, 1, look.hair);
                break;
        }
        add(4, head + 5, 1, 2, skinD); // oor
    }
    return r;
}

/**
 * Tekent rechthoeken in avatar-pixels (`unit` schermpixels per avatar-pixel) met (sx, sy) als oorsprong.
 * Twee passes: eerst alle rechthoeken 1 pixel groter in de outline-kleur, dan de kleuren.
 * Zo krijg je de typische Habbo-silhouetlijn zonder sprites.
 */
export function paintRects(
    ctx: CanvasRenderingContext2D,
    rects: Rect[],
    sx: number,
    sy: number,
    unit = U,
    mirror = false,
) {
    const px = (x: number, w: number) =>
        Math.round(sx + (mirror ? -x - w : x) * unit);
    const py = (y: number) => Math.round(sy + y * unit);

    ctx.fillStyle = OUTLINE;
    for (const [x, y, w, h] of rects)
        ctx.fillRect(
            px(x - 1, w + 2),
            py(y - 1),
            (w + 2) * unit,
            (h + 2) * unit,
        );
    for (const [x, y, w, h, c] of rects) {
        ctx.fillStyle = c;
        ctx.fillRect(px(x, w), py(y), w * unit, h * unit);
    }
}

/** Tekent een avatar met de voeten op (sx, sy). */
export function drawAvatar(
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    look: AvatarLook,
    pose: AvatarPose,
    opts: { shadow?: boolean } = {},
) {
    if (opts.shadow !== false && !pose.sitting) {
        ctx.fillStyle = "rgba(15, 30, 58, 0.22)";
        ctx.beginPath();
        ctx.ellipse(sx, sy, 15, 7, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    paintRects(ctx, buildRects(look, pose), sx, sy, U, !isRightDir(pose.dir));
}

/**
 * Recht achteraanzicht, zittend op een voertuig (de jetski in Wave Rush): benen
 * gespreid langs het zadel, armen naar voren naar het stuur. Zelfde look, kleuren,
 * kapsels en outline als in het hotel. Oorsprong = het zadel (onderkant van de romp).
 * `lean` (-1 … 1) laat het bovenlijf meeleunen in een bocht.
 */
export function buildRiderRects(look: AvatarLook, lean = 0): Rect[] {
    const r: Rect[] = [];
    const add = (x: number, y: number, w: number, h: number, c: string) =>
        r.push([x, y, w, h, c]);
    const skinD = shade(look.skin, -0.18);
    const shirtD = shade(look.shirt, -0.22);
    const pantsD = shade(look.pants, -0.22);
    // Bovenlijf schuift mee met het leunen, benen blijven op het zadel
    const l = Math.round(lean * 2);

    // 1. benen: dijen gespreid, onderbenen langs de zijkanten naar de voetsteunen
    add(-8, -2, 5, 3, look.pants);
    add(3, -2, 5, 3, look.pants);
    add(-9, 1, 3, 5, pantsD);
    add(6, 1, 3, 5, pantsD);
    add(-9, 6, 3, 2, look.shoes);
    add(6, 6, 3, 2, look.shoes);

    // 2. armen schuin naar voren, handen op het stuur
    add(-8 + l, -12, 3, 7, shirtD);
    add(5 + l, -12, 3, 7, look.shirt);
    add(-10 + l, -6, 2, 3, skinD);
    add(8 + l, -6, 2, 3, look.skin);

    // 3. romp met broekrand
    add(-5 + l, -13, 10, 13, look.shirt);
    add(3 + l, -13, 2, 13, shirtD);
    add(-5 + l, -2, 10, 2, pantsD);

    // 4. nek en achterhoofd; het haar bedekt het hoofd (zoals de achterkant in het hotel)
    add(-1 + l, -14, 3, 1, skinD);
    const head = -25;
    add(-5 + l, head, 10, 11, look.skin);
    add(-6 + l, head + 5, 1, 2, skinD);
    add(5 + l, head + 5, 1, 2, skinD);
    switch (look.hairStyle) {
        case 0:
            add(-5 + l, head - 1, 10, 8, look.hair);
            break;
        case 1:
            add(-6 + l, head - 1, 12, 16, look.hair);
            break;
        case 2:
            add(-6 + l, head - 4, 12, 11, look.hair);
            add(-4 + l, head - 5, 3, 1, look.hair);
            add(1 + l, head - 5, 3, 1, look.hair);
            break;
    }
    return r;
}
