import { iso, shade, TILE_W } from "../iso";
import type { Furni, FurniKind } from "../types";

type Ctx = CanvasRenderingContext2D;

/** Catalogus: naam, omschrijving en gedrag per meubelsoort. */
export const FURNI_INFO: Record<
    FurniKind,
    {
        name: string;
        description: string;
        walkable: boolean;
        seat?: number;
        game?: string;
        height: number;
    }
> = {
    chair: {
        name: "Kantinestoel",
        description: "Klik om te gaan zitten.",
        walkable: true,
        seat: 14,
        height: 36,
    },
    sofa: {
        name: "Bank",
        description: "Zacht en gezellig. Klik om te zitten.",
        walkable: true,
        seat: 12,
        height: 28,
    },
    table: {
        name: "Tafel",
        description: "Een plek om samen te lunchen.",
        walkable: false,
        height: 28,
    },
    chess: {
        name: "Schaakbord",
        description: "Spelhoek · Klik om een schaakpartij te spelen.",
        walkable: false,
        game: "Schaken",
        height: 30,
    },
    cardtable: {
        name: "Kaarttafel",
        description: "Klik om een potje Tribekaarten te spelen (2–4 spelers).",
        walkable: false,
        game: "Tribekaarten",
        height: 30,
    },
    plant: {
        name: "Plant",
        description: "Groen maakt alles beter.",
        walkable: false,
        height: 64,
    },
    lamp: {
        name: "Staande lamp",
        description: "Zorgt voor sfeer.",
        walkable: false,
        height: 74,
    },
    rug: {
        name: "Kleed",
        description: "Lekker zacht onder je voeten.",
        walkable: true,
        height: 0,
    },
    counter: {
        name: "Balie",
        description: "Koffie, thee en tosti’s.",
        walkable: false,
        height: 32,
    },
    arcade: {
        name: "Arcadekast",
        description: "Spelhoek · Retro-games voor twee.",
        walkable: false,
        game: "Arcade",
        height: 66,
    },
    stool: {
        name: "Barkruk",
        description: "Klik om te gaan zitten.",
        walkable: true,
        seat: 18,
        height: 22,
    },
    claw: {
        name: "Grijpmachine",
        description: "Wie grijpt de knuffel?",
        walkable: false,
        height: 76,
    },
    dancefloor: {
        name: "Dansvloer",
        description: "Typ /dance en ga los.",
        walkable: true,
        height: 0,
    },
    racer: {
        name: "Racekast",
        description: "Gas, rem en stuur: wie rijdt de snelste ronde?",
        walkable: false,
        game: "Racen",
        height: 84,
    },
    raceseat: {
        name: "Racestoel",
        description: "Klik om in te stappen.",
        walkable: true,
        seat: 10,
        height: 36,
    },
    hammer: {
        name: "Kop van Jut",
        description: "Sla zo hard je kunt en laat de bel rinkelen!",
        walkable: false,
        game: "Kop van Jut",
        height: 132,
    },
    airhockey: {
        name: "Airhockeytafel",
        description: "Snel, sneller, airhockey.",
        walkable: false,
        game: "Airhockey",
        height: 30,
    },
    neon: {
        name: "Neonbord",
        description: "Bzzzzt.",
        walkable: true,
        height: 0,
    },
    stack: {
        name: "Stack",
        description: "Stapel de blokken zo hoog als je kunt.",
        walkable: false,
        game: "Stack",
        height: 74,
    },
    scoreboard: {
        name: "Scorebord",
        description: "De beste spelers van vandaag.",
        walkable: true,
        height: 0,
    },
    waverush: {
        name: "Wave Rush",
        description: "Scheur op een jetski over de golven.",
        walkable: false,
        game: "Wave Rush",
        height: 78,
    },
    jetski: {
        name: "Jetski",
        description: "Stap op en geef gas!",
        walkable: true,
        seat: 16,
        game: "Wave Rush",
        height: 30,
    },
};

/**
 * Platte meubels: op de vloer (tapijt, dansvloer) of aan de muur (neonbord). Je loopt
 * eroverheen en ze worden vóór alle andere objecten getekend.
 */
export const isFlatFurni = (f: Furni) =>
    f.kind === "rug" ||
    f.kind === "dancefloor" ||
    f.kind === "neon" ||
    f.kind === "scoreboard";

const STROKE = "rgba(15, 30, 58, 0.45)";

function poly(ctx: Ctx, pts: Array<{ x: number; y: number }>, fill: string) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = STROKE;
    ctx.lineWidth = 1;
    ctx.stroke();
}

/**
 * Isometrisch blok van (x0,y0) tot (x1,y1) in tegel-coördinaten, van hoogte z0 tot z0+h (px).
 * Alleen de drie zichtbare vlakken: boven, linksvoor (y = y1) en rechtsvoor (x = x1).
 */
export function box(
    ctx: Ctx,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    z0: number,
    h: number,
    color: string,
) {
    const z1 = z0 + h;
    poly(
        ctx,
        [iso(x0, y1, z1), iso(x1, y1, z1), iso(x1, y1, z0), iso(x0, y1, z0)],
        shade(color, -0.12),
    );
    poly(
        ctx,
        [iso(x1, y0, z1), iso(x1, y1, z1), iso(x1, y1, z0), iso(x1, y0, z0)],
        shade(color, -0.28),
    );
    poly(
        ctx,
        [iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y1, z1), iso(x0, y1, z1)],
        color,
    );
}

/** Vlak op hoogte z (tapijt, schaakbord, scherm-bovenkant). */
function flat(
    ctx: Ctx,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    z: number,
    color: string,
    stroke = false,
) {
    ctx.beginPath();
    const pts = [
        iso(x0, y0, z),
        iso(x1, y0, z),
        iso(x1, y1, z),
        iso(x0, y1, z),
    ];
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (stroke) {
        ctx.strokeStyle = STROKE;
        ctx.stroke();
    }
}

/** Gevuld vlak zonder rand (schermbeelden). */
function fill(ctx: Ctx, pts: Array<{ x: number; y: number }>, color: string) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

export type Drawable = { key: number; draw: (ctx: Ctx) => void };

/**
 * Rugleuning van stoel/bank: aan de kant tegenover de kijkrichting.
 * Kijkt de zitter van de camera af (dir 0/6), dan staat de leuning vóór de avatar → apart sorteren.
 */
function backrest(f: Furni, inset: number, thick: number) {
    const { x, y } = f;
    const a = x + inset;
    const b = x + 1 - inset;
    const c = y + inset;
    const d = y + 1 - inset;
    switch (f.dir) {
        case 2:
            return { rect: [a, c, a + thick, d] as const, front: false };
        case 4:
            return { rect: [a, c, b, c + thick] as const, front: false };
        case 6:
            return { rect: [b - thick, c, b, d] as const, front: true };
        default:
            return { rect: [a, d - thick, b, d] as const, front: true };
    }
}

/**
 * Geeft de tekenstappen van een meubel terug met een diepte-sleutel (x + y).
 * De engine sorteert alles (meubels + avatars) op die sleutel: "painter's algorithm".
 */
export function furniDrawables(
    f: Furni,
    baseZ: number,
    now: number,
): Drawable[] {
    const { x, y } = f;
    const k = x + y;
    const color = f.color;

    switch (f.kind) {
        case "chair": {
            const c = color ?? "#2F6BFF";
            const back = backrest(f, 0.22, 0.1);
            const seat = (ctx: Ctx) => {
                for (const [lx, ly] of [
                    [0.24, 0.24],
                    [0.68, 0.24],
                    [0.24, 0.68],
                    [0.68, 0.68],
                ])
                    box(
                        ctx,
                        x + lx,
                        y + ly,
                        x + lx + 0.08,
                        y + ly + 0.08,
                        baseZ,
                        10,
                        "#5D6C88",
                    );
                box(ctx, x + 0.2, y + 0.2, x + 0.8, y + 0.8, baseZ + 10, 4, c);
            };
            const rest = (ctx: Ctx) =>
                box(ctx, ...back.rect, baseZ + 14, 20, shade(c, -0.05));
            return back.front
                ? [
                      { key: k, draw: seat },
                      { key: k + 0.7, draw: rest },
                  ]
                : [{ key: k, draw: (ctx) => (rest(ctx), seat(ctx)) }];
        }
        case "sofa": {
            const c = color ?? "#14B8A6";
            const back = backrest(f, 0.04, 0.24);
            const seat = (ctx: Ctx) =>
                box(ctx, x + 0.04, y + 0.04, x + 0.96, y + 0.96, baseZ, 12, c);
            const rest = (ctx: Ctx) =>
                box(ctx, ...back.rect, baseZ + 12, 16, shade(c, -0.08));
            return back.front
                ? [
                      { key: k, draw: seat },
                      { key: k + 0.7, draw: rest },
                  ]
                : [{ key: k, draw: (ctx) => (rest(ctx), seat(ctx)) }];
        }
        case "table":
        case "chess":
            return [
                {
                    key: k,
                    draw: (ctx) => {
                        box(
                            ctx,
                            x + 0.42,
                            y + 0.42,
                            x + 0.58,
                            y + 0.58,
                            baseZ,
                            24,
                            "#5D6C88",
                        );
                        box(
                            ctx,
                            x + 0.08,
                            y + 0.08,
                            x + 0.92,
                            y + 0.92,
                            baseZ + 24,
                            4,
                            color ?? "#F5F9FF",
                        );
                        if (f.kind === "chess") {
                            const n = 4;
                            const s = 0.7 / n;
                            for (let i = 0; i < n; i++)
                                for (let j = 0; j < n; j++) {
                                    const ox = x + 0.15 + i * s;
                                    const oy = y + 0.15 + j * s;
                                    flat(
                                        ctx,
                                        ox,
                                        oy,
                                        ox + s,
                                        oy + s,
                                        baseZ + 28,
                                        (i + j) % 2 ? "#0F1E3A" : "#FFFFFF",
                                    );
                                }
                            // Twee schaakstukken
                            for (const [px, py, pc] of [
                                [0.3, 0.3, "#FFFFFF"],
                                [0.65, 0.6, "#0F1E3A"],
                            ] as const)
                                box(
                                    ctx,
                                    x + px,
                                    y + py,
                                    x + px + 0.08,
                                    y + py + 0.08,
                                    baseZ + 28,
                                    9,
                                    pc,
                                );
                        }
                    },
                },
            ];
        case "cardtable":
            // Kaarttafel: groen speelkleed, een stapeltje kaarten (rug naar boven) en een open kaart
            return [
                {
                    key: k,
                    draw: (ctx) => {
                        box(
                            ctx,
                            x + 0.42,
                            y + 0.42,
                            x + 0.58,
                            y + 0.58,
                            baseZ,
                            24,
                            "#5D6C88",
                        );
                        box(
                            ctx,
                            x + 0.04,
                            y + 0.04,
                            x + 0.96,
                            y + 0.96,
                            baseZ + 24,
                            4,
                            color ?? "#7A5230",
                        );
                        flat(
                            ctx,
                            x + 0.12,
                            y + 0.12,
                            x + 0.88,
                            y + 0.88,
                            baseZ + 28,
                            "#0F766E",
                        );
                        // Stapel: vijf kaartjes die steeds iets verspringen
                        for (let i = 0; i < 5; i++) {
                            const o = (i % 2) * 0.012;
                            box(
                                ctx,
                                x + 0.24 + o,
                                y + 0.3 + o,
                                x + 0.46 + o,
                                y + 0.62 + o,
                                baseZ + 28 + i * 1.2,
                                1.2,
                                "#FFFFFF",
                            );
                        }
                        flat(
                            ctx,
                            x + 0.26,
                            y + 0.32,
                            x + 0.46,
                            y + 0.62,
                            baseZ + 34.2,
                            "#2F6BFF",
                        );
                        flat(
                            ctx,
                            x + 0.31,
                            y + 0.42,
                            x + 0.41,
                            y + 0.52,
                            baseZ + 34.2,
                            "#FFB627",
                        );
                        // Open kaart ernaast, met een knipperend randje zodat je ziet dat hier iets te doen is
                        flat(
                            ctx,
                            x + 0.56,
                            y + 0.36,
                            x + 0.76,
                            y + 0.66,
                            baseZ + 28.4,
                            "#FFFFFF",
                            true,
                        );
                        flat(
                            ctx,
                            x + 0.59,
                            y + 0.4,
                            x + 0.73,
                            y + 0.62,
                            baseZ + 28.4,
                            Math.floor(now / 700) % 2 ? "#FF6B6B" : "#E84A3A",
                        );
                        flat(
                            ctx,
                            x + 0.63,
                            y + 0.47,
                            x + 0.69,
                            y + 0.55,
                            baseZ + 28.4,
                            "#FFFFFF",
                        );
                    },
                },
            ];
        case "plant":
            return [
                {
                    key: k,
                    draw: (ctx) => {
                        box(
                            ctx,
                            x + 0.3,
                            y + 0.3,
                            x + 0.7,
                            y + 0.7,
                            baseZ,
                            16,
                            "#C8794A",
                        );
                        const c = iso(x + 0.5, y + 0.5, baseZ + 16);
                        const leaves: Array<[number, number, number, string]> =
                            [
                                [-10, -14, 12, "#0F766E"],
                                [10, -16, 12, "#0F766E"],
                                [0, -24, 14, "#14B8A6"],
                                [-8, -36, 11, "#14B8A6"],
                                [8, -38, 11, "#2DD4BF"],
                                [0, -46, 9, "#5EEAD4"],
                            ];
                        for (const [dx, dy, r, col] of leaves) {
                            ctx.beginPath();
                            ctx.arc(c.x + dx, c.y + dy, r, 0, Math.PI * 2);
                            ctx.fillStyle = col;
                            ctx.fill();
                            ctx.strokeStyle = STROKE;
                            ctx.stroke();
                        }
                    },
                },
            ];
        case "lamp":
            return [
                {
                    key: k,
                    draw: (ctx) => {
                        const glow = iso(x + 0.5, y + 0.5, baseZ + 62);
                        const g = ctx.createRadialGradient(
                            glow.x,
                            glow.y,
                            4,
                            glow.x,
                            glow.y,
                            70,
                        );
                        g.addColorStop(0, "rgba(255, 214, 120, 0.35)");
                        g.addColorStop(1, "rgba(255, 214, 120, 0)");
                        ctx.fillStyle = g;
                        ctx.fillRect(glow.x - 70, glow.y - 70, 140, 140);
                        box(
                            ctx,
                            x + 0.32,
                            y + 0.32,
                            x + 0.68,
                            y + 0.68,
                            baseZ,
                            4,
                            "#4B5B78",
                        );
                        box(
                            ctx,
                            x + 0.47,
                            y + 0.47,
                            x + 0.53,
                            y + 0.53,
                            baseZ + 4,
                            50,
                            "#4B5B78",
                        );
                        box(
                            ctx,
                            x + 0.3,
                            y + 0.3,
                            x + 0.7,
                            y + 0.7,
                            baseZ + 54,
                            16,
                            color ?? "#FFB627",
                        );
                    },
                },
            ];
        case "counter":
            return [
                {
                    key: k,
                    draw: (ctx) => {
                        box(
                            ctx,
                            x + 0.02,
                            y + 0.1,
                            x + 0.98,
                            y + 0.9,
                            baseZ,
                            28,
                            color ?? "#4B5B78",
                        );
                        box(
                            ctx,
                            x,
                            y + 0.05,
                            x + 1,
                            y + 0.95,
                            baseZ + 28,
                            4,
                            "#EEF3FA",
                        );
                    },
                },
            ];
        case "arcade":
            return [
                {
                    key: k,
                    draw: (ctx) => {
                        const c = color ?? "#7C5CFF";
                        box(
                            ctx,
                            x + 0.15,
                            y + 0.15,
                            x + 0.85,
                            y + 0.85,
                            baseZ,
                            62,
                            c,
                        );
                        // Scherm op de zichtbare voorkant, knipperend
                        const on = Math.floor(now / 500) % 2 === 0;
                        const scr = on ? "#22D3EE" : "#2F6BFF";
                        ctx.beginPath();
                        const pts =
                            f.dir === 4
                                ? [
                                      iso(x + 0.25, y + 0.85, baseZ + 54),
                                      iso(x + 0.75, y + 0.85, baseZ + 54),
                                      iso(x + 0.75, y + 0.85, baseZ + 34),
                                      iso(x + 0.25, y + 0.85, baseZ + 34),
                                  ]
                                : [
                                      iso(x + 0.85, y + 0.25, baseZ + 54),
                                      iso(x + 0.85, y + 0.75, baseZ + 54),
                                      iso(x + 0.85, y + 0.75, baseZ + 34),
                                      iso(x + 0.85, y + 0.25, baseZ + 34),
                                  ];
                        ctx.moveTo(pts[0].x, pts[0].y);
                        for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
                        ctx.closePath();
                        ctx.fillStyle = scr;
                        ctx.fill();
                        ctx.strokeStyle = "#0F1E3A";
                        ctx.stroke();
                        flat(
                            ctx,
                            x + 0.15,
                            y + 0.15,
                            x + 0.85,
                            y + 0.85,
                            baseZ + 62.5,
                            "#FF6B6B",
                        );
                    },
                },
            ];
        case "stool":
            return [
                {
                    key: k,
                    draw: (ctx) => {
                        box(
                            ctx,
                            x + 0.38,
                            y + 0.38,
                            x + 0.62,
                            y + 0.62,
                            baseZ,
                            2,
                            "#4B5B78",
                        );
                        box(
                            ctx,
                            x + 0.46,
                            y + 0.46,
                            x + 0.54,
                            y + 0.54,
                            baseZ + 2,
                            12,
                            "#9AA8C2",
                        );
                        box(
                            ctx,
                            x + 0.28,
                            y + 0.28,
                            x + 0.72,
                            y + 0.72,
                            baseZ + 14,
                            4,
                            color ?? "#FF6B6B",
                        );
                    },
                },
            ];
        case "claw":
            return [
                {
                    key: k,
                    draw: (ctx) => {
                        const c = color ?? "#FF6B6B";
                        const z = baseZ + 30;
                        box(
                            ctx,
                            x + 0.1,
                            y + 0.1,
                            x + 0.9,
                            y + 0.9,
                            baseZ,
                            30,
                            c,
                        );
                        // Knuffels achter het glas
                        for (const [px, py, pc] of [
                            [0.2, 0.25, "#FFB627"],
                            [0.5, 0.2, "#22D3EE"],
                            [0.3, 0.55, "#7C5CFF"],
                            [0.6, 0.55, "#14B8A6"],
                        ] as const)
                            box(
                                ctx,
                                x + px,
                                y + py,
                                x + px + 0.18,
                                y + py + 0.18,
                                z,
                                7,
                                pc,
                            );
                        // Grijper zakt langzaam op en neer
                        const drop = 10 + Math.sin(now / 700) * 6;
                        const hook = iso(x + 0.5, y + 0.5, z + 34);
                        ctx.strokeStyle = "#E5E7EB";
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(hook.x, hook.y);
                        ctx.lineTo(hook.x, hook.y + drop);
                        ctx.moveTo(hook.x - 4, hook.y + drop + 4);
                        ctx.lineTo(hook.x, hook.y + drop);
                        ctx.lineTo(hook.x + 4, hook.y + drop + 4);
                        ctx.stroke();
                        // Glazen kast: alleen de zichtbare vlakken, half doorzichtig
                        const glass = "rgba(186, 230, 253, 0.28)";
                        poly(
                            ctx,
                            [
                                iso(x + 0.1, y + 0.9, z + 34),
                                iso(x + 0.9, y + 0.9, z + 34),
                                iso(x + 0.9, y + 0.9, z),
                                iso(x + 0.1, y + 0.9, z),
                            ],
                            glass,
                        );
                        poly(
                            ctx,
                            [
                                iso(x + 0.9, y + 0.1, z + 34),
                                iso(x + 0.9, y + 0.9, z + 34),
                                iso(x + 0.9, y + 0.9, z),
                                iso(x + 0.9, y + 0.1, z),
                            ],
                            glass,
                        );
                        box(
                            ctx,
                            x + 0.08,
                            y + 0.08,
                            x + 0.92,
                            y + 0.92,
                            z + 34,
                            8,
                            shade(c, -0.1),
                        );
                    },
                },
            ];
        case "racer":
            // Alleen dir 4 (scherm naar voren); de racestoel staat op de tegel eronder
            return [
                {
                    key: k,
                    draw: (ctx) => {
                        const c = color ?? "#FF6B6B";
                        // Onderkast met dashboard, daarop de kap met het scherm en een lichtbak
                        box(
                            ctx,
                            x + 0.08,
                            y + 0.1,
                            x + 0.92,
                            y + 0.92,
                            baseZ,
                            26,
                            shade(c, -0.3),
                        );
                        box(
                            ctx,
                            x + 0.08,
                            y + 0.1,
                            x + 0.92,
                            y + 0.5,
                            baseZ + 26,
                            50,
                            c,
                        );
                        box(
                            ctx,
                            x + 0.04,
                            y + 0.06,
                            x + 0.96,
                            y + 0.56,
                            baseZ + 76,
                            8,
                            "#0F1E3A",
                        );
                        // Finishvlag-streep op de lichtbak
                        for (let i = 0; i < 8; i++)
                            flat(
                                ctx,
                                x + 0.06 + i * 0.11,
                                y + 0.42,
                                x + 0.17 + i * 0.11,
                                y + 0.53,
                                baseZ + 84.5,
                                i % 2 ? "#FFFFFF" : "#0F1E3A",
                            );

                        // Scherm: weg met bewegende middenstreep en een autootje
                        const P = (u: number, v: number) =>
                            iso(
                                x + 0.14 + u * 0.72,
                                y + 0.5,
                                baseZ + 32 + v * 38,
                            );
                        const frame = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)];
                        fill(ctx, frame, "#1E3A8A");
                        fill(
                            ctx,
                            [P(0, 0), P(1, 0), P(1, 0.55), P(0, 0.55)],
                            "#0F766E",
                        );
                        fill(
                            ctx,
                            [
                                P(0.12, 0),
                                P(0.88, 0),
                                P(0.53, 0.55),
                                P(0.47, 0.55),
                            ],
                            "#4B5B78",
                        );
                        for (let i = 0; i < 3; i++) {
                            const t = (now / 600 + i / 3) % 1; // 0 = horizon, 1 = vooraan
                            const v0 = 0.55 * (1 - t);
                            const v1 = Math.max(0, v0 - 0.08 * t - 0.02);
                            const w = 0.01 + 0.02 * t;
                            fill(
                                ctx,
                                [
                                    P(0.5 - w, v1),
                                    P(0.5 + w, v1),
                                    P(0.5 + w, v0),
                                    P(0.5 - w, v0),
                                ],
                                "#FFFFFF",
                            );
                        }
                        fill(
                            ctx,
                            [
                                P(0.4, 0.04),
                                P(0.6, 0.04),
                                P(0.58, 0.16),
                                P(0.42, 0.16),
                            ],
                            "#FFB627",
                        );
                        ctx.beginPath();
                        ctx.moveTo(frame[0].x, frame[0].y);
                        for (const q of frame.slice(1)) ctx.lineTo(q.x, q.y);
                        ctx.closePath();
                        ctx.strokeStyle = "#0F1E3A";
                        ctx.lineWidth = 2;
                        ctx.stroke();

                        // Stuur op een stuurkolom boven het dashboard
                        box(
                            ctx,
                            x + 0.47,
                            y + 0.68,
                            x + 0.53,
                            y + 0.74,
                            baseZ + 26,
                            8,
                            "#1F1F2E",
                        );
                        const wheel = iso(x + 0.5, y + 0.72, baseZ + 40);
                        ctx.beginPath();
                        ctx.ellipse(wheel.x, wheel.y, 10, 7, 0, 0, Math.PI * 2);
                        ctx.strokeStyle = "#1F1F2E";
                        ctx.lineWidth = 3.5;
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(wheel.x - 10, wheel.y);
                        ctx.lineTo(wheel.x + 10, wheel.y);
                        ctx.lineWidth = 2;
                        ctx.stroke();
                        ctx.lineWidth = 1;
                    },
                },
            ];
        case "raceseat": {
            const c = color ?? "#FF6B6B";
            const back = backrest(f, 0.12, 0.16);
            const seat = (ctx: Ctx) => {
                // Gas- en rempedaal
                box(
                    ctx,
                    x + 0.3,
                    y + 0.04,
                    x + 0.42,
                    y + 0.14,
                    baseZ,
                    4,
                    "#9AA8C2",
                );
                box(
                    ctx,
                    x + 0.58,
                    y + 0.04,
                    x + 0.7,
                    y + 0.14,
                    baseZ,
                    4,
                    "#9AA8C2",
                );
                box(
                    ctx,
                    x + 0.15,
                    y + 0.2,
                    x + 0.85,
                    y + 0.88,
                    baseZ,
                    6,
                    "#1F1F2E",
                );
                box(
                    ctx,
                    x + 0.18,
                    y + 0.24,
                    x + 0.82,
                    y + 0.84,
                    baseZ + 6,
                    4,
                    c,
                );
            };
            const rest = (ctx: Ctx) => {
                box(ctx, ...back.rect, baseZ + 10, 24, shade(c, -0.1));
                box(ctx, ...back.rect, baseZ + 28, 3, "#FFFFFF");
            };
            return back.front
                ? [
                      { key: k, draw: seat },
                      { key: k + 0.7, draw: rest },
                  ]
                : [{ key: k, draw: (ctx) => (rest(ctx), seat(ctx)) }];
        }
        case "hammer":
            // Kop van Jut. Alleen dir 4: het slagkussen zit aan de voorkant
            return [
                {
                    key: k,
                    draw: (ctx) => {
                        const z0 = baseZ + 6;
                        box(
                            ctx,
                            x + 0.05,
                            y + 0.05,
                            x + 0.95,
                            y + 0.95,
                            baseZ,
                            6,
                            "#3B4A68",
                        );
                        // Paal met krachtschaal
                        const scale = [
                            "#14B8A6",
                            "#22D3EE",
                            "#2F6BFF",
                            "#7C5CFF",
                            "#FFB627",
                            "#FF6B6B",
                        ];
                        scale.forEach((col, i) =>
                            box(
                                ctx,
                                x + 0.42,
                                y + 0.18,
                                x + 0.58,
                                y + 0.3,
                                z0 + i * 18,
                                18,
                                col,
                            ),
                        );
                        // Om de paar seconden schiet het blokje omhoog; bovenaan rinkelt de bel
                        const t = (now % 3600) / 3600;
                        const h =
                            t < 0.5 ? Math.sin((t / 0.5) * Math.PI) * 100 : 0;
                        const ding = h > 92;
                        const bell = iso(x + 0.5, y + 0.24, z0 + 116);
                        if (ding) {
                            const g = ctx.createRadialGradient(
                                bell.x,
                                bell.y,
                                2,
                                bell.x,
                                bell.y,
                                28,
                            );
                            g.addColorStop(0, "rgba(255, 214, 120, 0.8)");
                            g.addColorStop(1, "rgba(255, 214, 120, 0)");
                            ctx.fillStyle = g;
                            ctx.fillRect(bell.x - 28, bell.y - 28, 56, 56);
                        }
                        ctx.beginPath();
                        ctx.arc(bell.x, bell.y, 8, Math.PI, 0);
                        ctx.lineTo(bell.x + 9, bell.y + 4);
                        ctx.lineTo(bell.x - 9, bell.y + 4);
                        ctx.closePath();
                        ctx.fillStyle = ding ? "#FFE58A" : "#FFB627";
                        ctx.fill();
                        ctx.strokeStyle = STROKE;
                        ctx.stroke();
                        box(
                            ctx,
                            x + 0.38,
                            y + 0.3,
                            x + 0.62,
                            y + 0.36,
                            z0 + h,
                            6,
                            "#FFFFFF",
                        );
                        // Slagkussen
                        box(
                            ctx,
                            x + 0.28,
                            y + 0.48,
                            x + 0.72,
                            y + 0.86,
                            z0,
                            8,
                            "#FF6B6B",
                        );
                        flat(
                            ctx,
                            x + 0.4,
                            y + 0.58,
                            x + 0.6,
                            y + 0.76,
                            z0 + 8,
                            "#FFB627",
                        );
                        // De hamer ligt ernaast
                        box(
                            ctx,
                            x + 0.82,
                            y + 0.36,
                            x + 0.88,
                            y + 0.9,
                            z0,
                            3,
                            "#C8794A",
                        );
                        box(
                            ctx,
                            x + 0.76,
                            y + 0.2,
                            x + 0.94,
                            y + 0.38,
                            z0,
                            10,
                            "#4B5B78",
                        );
                    },
                },
            ];
        case "airhockey":
            return [
                {
                    key: k,
                    draw: (ctx) => {
                        box(
                            ctx,
                            x + 0.4,
                            y + 0.4,
                            x + 0.6,
                            y + 0.6,
                            baseZ,
                            18,
                            "#1F1F2E",
                        );
                        box(
                            ctx,
                            x + 0.04,
                            y + 0.04,
                            x + 0.96,
                            y + 0.96,
                            baseZ + 18,
                            6,
                            color ?? "#2F6BFF",
                        );
                        const z = baseZ + 24;
                        flat(
                            ctx,
                            x + 0.1,
                            y + 0.1,
                            x + 0.9,
                            y + 0.9,
                            z,
                            "#E0F2FE",
                        );
                        flat(
                            ctx,
                            x + 0.1,
                            y + 0.49,
                            x + 0.9,
                            y + 0.51,
                            z,
                            "#FF6B6B",
                        );
                        flat(
                            ctx,
                            x + 0.38,
                            y + 0.1,
                            x + 0.62,
                            y + 0.14,
                            z,
                            "#0F1E3A",
                        );
                        flat(
                            ctx,
                            x + 0.38,
                            y + 0.86,
                            x + 0.62,
                            y + 0.9,
                            z,
                            "#0F1E3A",
                        );
                        // Puck die heen en weer schiet, met aan elke kant een pusher die meebeweegt
                        const u = Math.sin(now / 430) * 0.28;
                        const px = x + 0.5 + u;
                        const py = y + 0.5 + Math.sin(now / 290) * 0.3;
                        box(
                            ctx,
                            px - 0.05,
                            py - 0.05,
                            px + 0.05,
                            py + 0.05,
                            z,
                            2,
                            "#0F1E3A",
                        );
                        box(
                            ctx,
                            px - 0.06,
                            y + 0.16,
                            px + 0.06,
                            y + 0.28,
                            z,
                            6,
                            "#FF6B6B",
                        );
                        box(
                            ctx,
                            x + 0.44 - u,
                            y + 0.72,
                            x + 0.56 - u,
                            y + 0.84,
                            z,
                            6,
                            "#14B8A6",
                        );
                    },
                },
            ];
        case "stack":
            // Arcadekast met het spel Stack. Alleen dir 4 (scherm naar voren), net als de kast die hij verving
            return [
                {
                    key: k,
                    draw: (ctx) => {
                        const c = color ?? "#2F6BFF";
                        box(
                            ctx,
                            x + 0.15,
                            y + 0.15,
                            x + 0.85,
                            y + 0.85,
                            baseZ,
                            62,
                            c,
                        );
                        // Neon-gloed rond het scherm, die zachtjes pulseert
                        const P = (u: number, v: number) =>
                            iso(
                                x + 0.24 + u * 0.52,
                                y + 0.85,
                                baseZ + 32 + v * 24,
                            );
                        const screen = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)];
                        ctx.save();
                        ctx.shadowColor = "#22D3EE";
                        ctx.shadowBlur = 8 + Math.sin(now / 300) * 4;
                        fill(ctx, screen, "#0F1E3A");
                        ctx.restore();
                        // Mini-Stack: elke 450 ms komt er een laag bij, de bovenste schuift heen en weer
                        const layers = 1 + (Math.floor(now / 450) % 6);
                        for (let i = 0; i < layers; i++) {
                            const top = i === layers - 1;
                            const shift = top ? Math.sin(now / 140) * 0.12 : 0;
                            const w = 0.5 - i * 0.04;
                            const u0 = 0.5 - w / 2 + shift;
                            const v0 = 0.08 + i * 0.13;
                            fill(
                                ctx,
                                [
                                    P(u0, v0),
                                    P(u0 + w, v0),
                                    P(u0 + w, v0 + 0.11),
                                    P(u0, v0 + 0.11),
                                ],
                                STACK_COLORS[i],
                            );
                        }
                        ctx.beginPath();
                        ctx.moveTo(screen[0].x, screen[0].y);
                        for (const q of screen.slice(1)) ctx.lineTo(q.x, q.y);
                        ctx.closePath();
                        ctx.strokeStyle = "#22D3EE";
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                        ctx.lineWidth = 1;
                        // Lichtbak met "STACK" bovenop
                        box(
                            ctx,
                            x + 0.1,
                            y + 0.6,
                            x + 0.9,
                            y + 0.9,
                            baseZ + 62,
                            12,
                            "#0F1E3A",
                        );
                        const label = iso(x + 0.1, y + 0.9, baseZ + 74);
                        ctx.save();
                        ctx.transform(1, 0.5, 0, 1, label.x, label.y);
                        ctx.font =
                            "bold 9px Silkscreen, ui-monospace, monospace";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.shadowColor = "#FF4FD8";
                        ctx.shadowBlur =
                            Math.floor(now / 900) % 7 === 0 ? 0 : 6;
                        ctx.fillStyle = "#FFD1F5";
                        ctx.fillText("STACK", 0.4 * (TILE_W / 2), 6);
                        ctx.restore();
                    },
                },
            ];
        case "waverush":
            // Wave Rush-kast. Alleen dir 4 (scherm naar voren); de jetski staat op de tegel eronder
            return [
                {
                    key: k,
                    draw: (ctx) => {
                        box(
                            ctx,
                            x + 0.15,
                            y + 0.15,
                            x + 0.85,
                            y + 0.85,
                            baseZ,
                            62,
                            color ?? "#0E7490",
                        );
                        const P = (u: number, v: number) =>
                            iso(
                                x + 0.22 + u * 0.56,
                                y + 0.85,
                                baseZ + 30 + v * 26,
                            );
                        const screen = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)];
                        ctx.save();
                        ctx.shadowColor = "#22D3EE";
                        ctx.shadowBlur = 8 + Math.sin(now / 350) * 4;
                        fill(ctx, screen, "#0E7490");
                        ctx.restore();
                        // Scherm: zonsondergang, zee met bewegende golven en af en toe een jetski
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(screen[0].x, screen[0].y);
                        for (const q of screen.slice(1)) ctx.lineTo(q.x, q.y);
                        ctx.closePath();
                        ctx.clip();
                        fill(
                            ctx,
                            [P(0, 0.55), P(1, 0.55), P(1, 1), P(0, 1)],
                            "#7C5CFF",
                        );
                        fill(
                            ctx,
                            [P(0, 0.55), P(1, 0.55), P(1, 0.72), P(0, 0.72)],
                            "#FF8FB1",
                        );
                        fill(
                            ctx,
                            [
                                P(0.4, 0.55),
                                P(0.6, 0.55),
                                P(0.56, 0.68),
                                P(0.44, 0.68),
                            ],
                            "#FFD27A",
                        );
                        for (let row = 0; row < 3; row++) {
                            const v = 0.1 + row * 0.14;
                            for (let i = -1; i < 3; i++) {
                                const u =
                                    (i * 0.4 +
                                        ((now / (500 + row * 200)) % 1) * 0.4) %
                                    1.2;
                                fill(
                                    ctx,
                                    [
                                        P(u, v),
                                        P(u + 0.16, v),
                                        P(u + 0.16, v + 0.04),
                                        P(u, v + 0.04),
                                    ],
                                    "#5EEAD4",
                                );
                            }
                        }
                        const t = (now % 3200) / 3200;
                        const ju = -0.3 + t * 1.6;
                        fill(
                            ctx,
                            [
                                P(ju - 0.25, 0.2),
                                P(ju, 0.2),
                                P(ju, 0.24),
                                P(ju - 0.25, 0.24),
                            ],
                            "#E0F7FF",
                        );
                        fill(
                            ctx,
                            [
                                P(ju, 0.2),
                                P(ju + 0.14, 0.2),
                                P(ju + 0.12, 0.3),
                                P(ju + 0.02, 0.3),
                            ],
                            "#FFFFFF",
                        );
                        ctx.restore();
                        ctx.beginPath();
                        ctx.moveTo(screen[0].x, screen[0].y);
                        for (const q of screen.slice(1)) ctx.lineTo(q.x, q.y);
                        ctx.closePath();
                        ctx.strokeStyle = "#22D3EE";
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                        ctx.lineWidth = 1;
                        // Lichtbak met "WAVE / RUSH" in turquoise neon
                        box(
                            ctx,
                            x + 0.1,
                            y + 0.6,
                            x + 0.9,
                            y + 0.9,
                            baseZ + 62,
                            16,
                            "#0F1E3A",
                        );
                        const label = iso(x + 0.1, y + 0.9, baseZ + 78);
                        ctx.save();
                        ctx.transform(1, 0.5, 0, 1, label.x, label.y);
                        ctx.font =
                            "bold 7px Silkscreen, ui-monospace, monospace";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.shadowColor = "#22D3EE";
                        ctx.shadowBlur =
                            Math.floor(now / 1100) % 9 === 0 ? 0 : 6;
                        ctx.fillStyle = "#CFFAFE";
                        ctx.fillText("WAVE", 0.4 * (TILE_W / 2), 4.5);
                        ctx.fillText("RUSH", 0.4 * (TILE_W / 2), 11.5);
                        ctx.restore();
                    },
                },
            ];
        case "jetski": {
            // Jetski om op te zitten, met de neus naar de kast (dir 0); deint zachtjes op en neer
            const bob = Math.sin(now / 450) * 1.2;
            const z = baseZ + 3 + bob;
            return [
                {
                    key: k,
                    draw: (ctx) => {
                        box(
                            ctx,
                            x + 0.04,
                            y + 0.04,
                            x + 0.96,
                            y + 0.96,
                            baseZ,
                            3,
                            "#0E7490",
                        );
                        flat(
                            ctx,
                            x + 0.12,
                            y + 0.12,
                            x + 0.88,
                            y + 0.88,
                            baseZ + 3,
                            "#22A6EE",
                        );
                        // Schuim rond de romp
                        flat(
                            ctx,
                            x + 0.2,
                            y + 0.14,
                            x + 0.8,
                            y + 0.96,
                            baseZ + 3.2,
                            "#E0F7FF",
                        );
                        box(
                            ctx,
                            x + 0.28,
                            y + 0.2,
                            x + 0.72,
                            y + 0.92,
                            z,
                            3,
                            color ?? "#22D3EE",
                        );
                        box(
                            ctx,
                            x + 0.28,
                            y + 0.2,
                            x + 0.72,
                            y + 0.92,
                            z + 3,
                            5,
                            "#FFFFFF",
                        );
                        box(
                            ctx,
                            x + 0.34,
                            y + 0.06,
                            x + 0.66,
                            y + 0.22,
                            z + 1,
                            6,
                            "#FFFFFF",
                        );
                        box(
                            ctx,
                            x + 0.36,
                            y + 0.5,
                            x + 0.64,
                            y + 0.88,
                            z + 8,
                            5,
                            "#0F1E3A",
                        );
                        // Stuur
                        box(
                            ctx,
                            x + 0.47,
                            y + 0.3,
                            x + 0.53,
                            y + 0.36,
                            z + 8,
                            10,
                            "#1F1F2E",
                        );
                        box(
                            ctx,
                            x + 0.24,
                            y + 0.3,
                            x + 0.76,
                            y + 0.35,
                            z + 18,
                            2,
                            "#1F1F2E",
                        );
                        box(
                            ctx,
                            x + 0.2,
                            y + 0.29,
                            x + 0.27,
                            y + 0.36,
                            z + 17,
                            3,
                            "#FF6B6B",
                        );
                        box(
                            ctx,
                            x + 0.73,
                            y + 0.29,
                            x + 0.8,
                            y + 0.36,
                            z + 17,
                            3,
                            "#FF6B6B",
                        );
                    },
                },
            ];
        }
        case "rug":
        case "dancefloor":
        case "neon":
        case "scoreboard":
            return [];
    }
}

/** Kleurverloop van de mini-toren op het scherm van de Stack-kast. */
const STACK_COLORS = [
    "#7C5CFF",
    "#5B6BFF",
    "#2F6BFF",
    "#22A6EE",
    "#22D3EE",
    "#5EEAD4",
];

/**
 * Neonbord tegen de muur. dir 4 = achterwand (vlak y = f.y), dir 2 = linkermuur (vlak x = f.x).
 * Getekend in "muurcoördinaten" (u langs de muur, v omlaag) via een scheve transformatie.
 */
function onWall(ctx: Ctx, f: Furni, top: number) {
    const w = f.w ?? 2;
    const back = f.dir === 4;
    const o = back ? iso(f.x, f.y, top) : iso(f.x, f.y + w, top);
    ctx.save();
    ctx.transform(1, back ? 0.5 : -0.5, 0, 1, o.x, o.y);
    return w * (TILE_W / 2);
}

function drawNeon(ctx: Ctx, f: Furni, now: number) {
    const c = f.color ?? "#FF6B6B";
    // Af en toe heel even flikkeren, zoals een echte neonbuis
    const flicker = Math.sin(now / 70 + f.x * 7 + f.y * 3) > 0.985;
    const len = onWall(ctx, f, 108);
    ctx.globalAlpha = flicker ? 0.45 : 1;
    ctx.beginPath();
    ctx.roundRect(6, 2, len - 12, 30, 6);
    ctx.fillStyle = "rgba(12, 8, 36, 0.85)";
    ctx.fill();
    ctx.shadowColor = c;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "bold 14px Silkscreen, ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = shade(c, 0.55);
    ctx.fillText(f.text ?? "ARCADE", len / 2, 18, len - 20);
    ctx.restore();
}

/**
 * Scorebord aan de muur (zelfde muurcoördinaten als het neonbord). `text` bevat één
 * pagina per spel (gescheiden door \f) die om de beurt getoond worden; per pagina is
 * de eerste regel de kop en de rest de scores. De lobby vult ze via HotelEngine.setFurniText.
 */
function drawScoreboard(ctx: Ctx, f: Furni, now: number) {
    const pages = (f.text ?? "").split("\f");
    const page = Math.floor(now / SCOREBOARD_PAGE_MS) % pages.length;
    const [title = "SCORES", ...rows] = pages[page].split("\n");
    const c = f.color ?? "#22D3EE";
    const len = onWall(ctx, f, 114);
    ctx.beginPath();
    ctx.roundRect(4, 0, len - 8, 50, 5);
    ctx.fillStyle = "rgba(12, 8, 36, 0.92)";
    ctx.fill();
    ctx.shadowColor = c;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.textBaseline = "middle";
    ctx.font = "bold 8px Silkscreen, ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = Math.floor(now / 600) % 2 ? "#FFB627" : "#FFD27A";
    ctx.fillText(title, len / 2, 8, len - 16);
    ctx.font = "7px Silkscreen, ui-monospace, monospace";
    const lines = rows.length ? rows : ["Nog geen scores"];
    lines.slice(0, 3).forEach((row, i) => {
        const [name, score = ""] = row.split("\t");
        ctx.textAlign = "left";
        ctx.fillStyle = shade(c, 0.5);
        ctx.fillText(name, 12, 20 + i * 10, len - 50);
        ctx.textAlign = "right";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(score, len - 12, 20 + i * 10);
    });
    // Bolletjes onderaan: welke pagina je ziet
    pages.forEach((_, i) => {
        ctx.fillStyle = i === page ? c : "rgba(255, 255, 255, 0.25)";
        ctx.fillRect(len / 2 - pages.length * 3 + i * 6, 45, 3, 2);
    });
    ctx.restore();
}

const SCOREBOARD_PAGE_MS = 6000;

/** Platte meubels (zie isFlatFurni) worden vóór alle andere objecten getekend. */
export function drawFlatFurni(ctx: Ctx, f: Furni, baseZ: number, now: number) {
    if (f.kind === "neon") return drawNeon(ctx, f, now);
    if (f.kind === "scoreboard") return drawScoreboard(ctx, f, now);
    const w = f.w ?? 1;
    const d = f.d ?? 1;
    if (f.kind === "dancefloor") {
        // Disco-tegels die om de beurt van kleur wisselen
        const colors = [
            "#FF6B6B",
            "#FFB627",
            "#22D3EE",
            "#7C5CFF",
            "#14B8A6",
            "#2F6BFF",
        ];
        const beat = Math.floor(now / 450);
        for (let i = 0; i < w; i++)
            for (let j = 0; j < d; j++) {
                const c = colors[(i * 2 + j * 3 + beat) % colors.length];
                flat(
                    ctx,
                    f.x + i + 0.04,
                    f.y + j + 0.04,
                    f.x + i + 0.96,
                    f.y + j + 0.96,
                    baseZ + 1,
                    shade(c, -0.2),
                    true,
                );
                flat(
                    ctx,
                    f.x + i + 0.16,
                    f.y + j + 0.16,
                    f.x + i + 0.84,
                    f.y + j + 0.84,
                    baseZ + 1,
                    c,
                );
            }
        return;
    }
    const c = f.color ?? "#FF6B6B";
    flat(
        ctx,
        f.x + 0.1,
        f.y + 0.1,
        f.x + w - 0.1,
        f.y + d - 0.1,
        baseZ + 1,
        shade(c, -0.15),
        true,
    );
    flat(
        ctx,
        f.x + 0.25,
        f.y + 0.25,
        f.x + w - 0.25,
        f.y + d - 0.25,
        baseZ + 1,
        c,
    );
    flat(
        ctx,
        f.x + 0.45,
        f.y + 0.45,
        f.x + w - 0.45,
        f.y + d - 0.45,
        baseZ + 1,
        shade(c, 0.35),
    );
}
