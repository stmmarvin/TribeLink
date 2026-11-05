import type { Rect } from "../draw/avatar";
import type { ObjectKind } from "./obstacles";

/**
 * Wave Rush — pixel-art sprites, getekend uit tekstkaartjes: elke letter is één
 * pixel in een kleur, een punt is doorzichtig. Ze worden één keer op een klein
 * canvas gezet en daarna geschaald getekend (geen afbeeldingsbestanden nodig).
 * De rijder zelf is de hotel-avatar (draw/avatar.ts → buildRiderRects).
 */

const PALETTE: Record<string, string> = {
    r: "#FF4D4D",
    w: "#FFFFFF",
    y: "#FFD27A",
    Y: "#FFB627",
    k: "#0F1E3A",
    q: "#4B5B78",
    Q: "#7C8BA8",
    n: "#5A3A1E",
    N: "#8B5A2B",
    c: "#22D3EE",
    C: "#A5F3FC",
    t: "#2DD4BF",
    T: "#0E7490",
    f: "#E0F7FF",
    G: "#16A34A",
    g: "#166534",
    s: "#F5D08A",
    S: "#E2B76A",
    e: "#22C55E",
    o: "#FF8A3D",
    b: "#60A5FA",
};

/** Checkpoint-boog: twee palen met een geblokte banier ertussen. */
function gateMap(): string[] {
    const w = 40;
    const rows: string[] = [];
    for (let y = 0; y < 26; y++) {
        let row = "";
        for (let x = 0; x < w; x++) {
            const post = x < 3 || x >= w - 3;
            if (y < 5)
                row += (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? "k" : "w";
            else if (y === 25) row += post ? "f" : ".";
            else if (post) row += Math.floor(y / 3) % 2 ? "o" : "w";
            else row += ".";
        }
        rows.push(row);
    }
    return rows;
}

type SpriteName = Exclude<ObjectKind, "marker"> | "markerLeft" | "markerRight";

const MAPS: Record<SpriteName, string[]> = {
    buoy: [
        "...Y...",
        "...k...",
        "..rrr..",
        "..www..",
        ".rrrrr.",
        ".wwwww.",
        "rrrrrrr",
        ".fffff.",
    ],
    rock: [
        "....qqqq....",
        "..qqqQQqq...",
        ".qQQQQQQqqq.",
        "qQQQQQQQQQqq",
        "qQQQQQQQQQQq",
        "qqQQQQQQQqqq",
        "ffffffffffff",
    ],
    driftwood: [
        "..nnnnnnnnnnnn..",
        ".nNNNNnNNNNNNNn.",
        "nNNnNNNNNnNNNNNn",
        ".nnnnnnnnnnnnnn.",
        "ffffffffffffffff",
    ],
    boat: [
        "....wwwwww....",
        "...wkkkkkkw...",
        "...wkkkkkkw...",
        ".wwwwwwwwwwww.",
        "wrrrrrrrrrrrrw",
        "wwwwwwwwwwwwww",
        ".wwwwwwwwwwww.",
        "..ffffffffff..",
    ],
    coin: [".yyyy.", "yYYYYy", "yYyyYy", "yYyyYy", "yYYYYy", ".yyyy."],
    boost: [
        "....cC",
        "...cC.",
        "..cC..",
        ".ccccc",
        "...cC.",
        "..cC..",
        ".cC...",
        "cC....",
    ],
    ramp: [
        "..........ffffff",
        ".......ffftttttt",
        "....ffftttttttTT",
        "..fftttttttttTTT",
        "ffttttttttttTTTT",
        "TTTTTTTTTTTTTTTT",
    ],
    gate: gateMap(),
    markerLeft: ["..Y..", ".rrr.", ".rwr.", "rrrrr", "rrrrr", ".fff."],
    markerRight: ["..Y..", ".eee.", ".ewe.", "eeeee", "eeeee", ".fff."],
    island: [
        "..........GGGG............",
        ".......GGGGGGGGGG.........",
        ".....GGGgGGGGGgGGGG.......",
        "...GGGGGGGGGgGGGGGGGGG....",
        ".GGGGGGgGGGGGGGGGGGgGGGG..",
        "ssssssssssssssssssssssssS.",
        "sssssssSssssssssssssssssss",
        "ffffffffffffffffffffffffff",
    ],
    palm: [
        "..GG...GG..",
        ".GGGG.GGGG.",
        "GG..GGG..GG",
        "G...GnG...G",
        ".....n.....",
        "....n......",
        "....n......",
        "....nn.....",
        ".....n.....",
        ".....n.....",
        "....nn.....",
        "....n......",
        "...sssss...",
        ".sssssssss.",
        "fffffffffff",
    ],
    cliff: [
        ".....qq.........",
        "....qQQq...qq...",
        "...qQQQQq.qQQq..",
        "..qQQQQQQqQQQQq.",
        ".qQQQQQQQQQQQQQq",
        "qQQQQQQQQQQQQQQQ",
        "qQQQQQkQQQQQkQQQ",
        "qqqqqqqqqqqqqqqq",
        "ffffffffffffffff",
    ],
    beach: [
        ".......rrr..............",
        "......rwrwr.............",
        ".........n..............",
        "sssssssssnssssssssssssss",
        "ssssssSsssssssssSsssssss",
        "ffffffffffffffffffffffff",
    ],
    harbor: [
        "....rrrrrr..........",
        "...rrrrrrrr.........",
        "..rrrrrrrrrr....k...",
        "...wwwwwwww.....k...",
        "...wbbwwbbw....kk...",
        "...wbbwwbbw...kkkk..",
        "...wwwkkwww..wwwwww.",
        "...wwwkkwww...wwww..",
        "nnnnnnnnnnnnnnnnnnnn",
        "n..n...n...n...n...n",
        "ffffffffffffffffffff",
    ],
};

function paint(map: string[]): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = map[0].length;
    canvas.height = map.length;
    const ctx = canvas.getContext("2d")!;
    map.forEach((row, y) =>
        row.split("").forEach((ch, x) => {
            if (!PALETTE[ch]) return;
            ctx.fillStyle = PALETTE[ch];
            ctx.fillRect(x, y, 1, 1);
        }),
    );
    return canvas;
}

export type Sprites = Record<SpriteName, HTMLCanvasElement>;

export function makeSprites(): Sprites {
    return Object.fromEntries(
        Object.entries(MAPS).map(([name, map]) => [name, paint(map)]),
    ) as Sprites;
}

/** Welke sprite bij een object hoort (boeienlijn: rood links, groen rechts). */
export const spriteFor = (kind: ObjectKind, offset: number): SpriteName =>
    kind === "marker" ? (offset < 0 ? "markerLeft" : "markerRight") : kind;

/**
 * De jetski van achteren, in avatar-pixels met het zadel als oorsprong (zoals
 * buildRiderRects), zodat hij dezelfde outline krijgt en de rijder er precies op past.
 */
export const JETSKI_RECTS: Rect[] = [
    // Voorkant/kap achter de rijder
    [-9, -9, 18, 4, "#E5E7EB"],
    [-12, -8, 4, 4, "#22D3EE"],
    [8, -8, 4, 4, "#22D3EE"],
    // Stuur met rode handvatten
    [-12, -5, 24, 1, "#1F1F2E"],
    [-1, -6, 2, 3, "#1F1F2E"],
    [-14, -6, 3, 2, "#FF4D4D"],
    [11, -6, 3, 2, "#FF4D4D"],
    // Zadel
    [-6, -1, 12, 4, "#0F1E3A"],
    // Romp: witte zijkanten met turquoise streep, achterlichten
    [-14, 0, 28, 1, "#F1F5F9"],
    [-16, 1, 32, 5, "#FFFFFF"],
    [-16, 3, 32, 1, "#22D3EE"],
    [-18, 3, 2, 4, "#FFFFFF"],
    [16, 3, 2, 4, "#FFFFFF"],
    [-15, 1, 2, 1, "#FF4D4D"],
    [13, 1, 2, 1, "#FF4D4D"],
    // Onderkant van de romp en de waterstraal-uitlaat
    [-17, 6, 34, 3, "#9AA8C2"],
    [-14, 9, 28, 2, "#6B7A99"],
    [-3, 6, 6, 4, "#1F1F2E"],
];

/** Uitersten van jetski + rijder in avatar-pixels (voor de grootte van het tussen-canvas). */
export const RIDER_BOUNDS = { left: -19, right: 19, top: -31, bottom: 12 };
