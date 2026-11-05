import { memo } from "react";
import { CARD_COLORS, cardColor, cardValue, spritePath } from "@/lib/cards";
import { cn } from "@/lib/utils";
import type { CardCode, CardColor } from "@/types";

/**
 * A Tribekaarten card in the TribeLink pixel style: a 24×34 pixel grid.
 * Every colour has its own background pattern and shape in the corner
 * (Zon: dots and a sun, Zee: waves, Blad: stripes and a leaf, Vuur: a
 * chequer and a diamond), so the colours stay apart for colour-blind
 * players too. Digits and action symbols are pixel sprites of our own.
 */
const W = 24;
const H = 34;

/** 3×5 pixel digits. */
const DIGITS: Record<string, string[]> = {
    "0": ["###", "#.#", "#.#", "#.#", "###"],
    "1": [".#.", "##.", ".#.", ".#.", "###"],
    "2": ["###", "..#", "###", "#..", "###"],
    "3": ["###", "..#", "###", "..#", "###"],
    "4": ["#.#", "#.#", "###", "..#", "..#"],
    "5": ["###", "#..", "###", "..#", "###"],
    "6": ["###", "#..", "###", "#.#", "###"],
    "7": ["###", "..#", ".#.", ".#.", ".#."],
    "8": ["###", "#.#", "###", "#.#", "###"],
    "9": ["###", "#.#", "###", "..#", "###"],
};

const PLUS = [".#.", "###", ".#."];

/** 7×7 action symbols in the middle of the card. */
const ICONS: Record<"skip" | "reverse" | "wild", string[]> = {
    // Ring with a bar through it: your turn is skipped
    skip: [
        "..###..",
        ".##..#.",
        "#.#...#",
        "#..#..#",
        "#...#.#",
        ".#..##.",
        "..###..",
    ],
    // Two arrows the other way round
    reverse: [
        ".#.....",
        "#######",
        ".#.....",
        ".......",
        ".....#.",
        "#######",
        ".....#.",
    ],
    // Star: any colour
    wild: [
        "...#...",
        "...#...",
        "#######",
        ".#####.",
        "..###..",
        ".##.##.",
        ".#...#.",
    ],
};

/** 5×5 versions for the corner. */
const SMALL_ICONS: Record<"skip" | "reverse" | "wild", string[]> = {
    skip: [".###.", "##..#", "#.#.#", "#..##", ".###."],
    reverse: [".#...", "#####", ".....", "#####", "...#."],
    wild: ["..#..", "#####", ".###.", ".#.#.", "#...#"],
};

/** The shape of each colour (5×5), bottom right. */
const SHAPES: Record<CardColor, string[]> = {
    sun: [".###.", "#####", "#####", "#####", ".###."],
    sea: [".##..", "#..##", ".....", ".##..", "#..##"],
    leaf: ["..#..", ".###.", ".###.", "#####", "..#.."],
    fire: ["..#..", ".###.", "#####", ".###.", "..#.."],
};

/** Background pattern per colour, as an SVG path over (x0, y0)–(x1, y1). */
function pattern(
    color: CardColor,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
) {
    let d = "";

    for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
            const on = {
                sun: x % 4 === 1 && y % 4 === 1,
                sea: (y % 5 === 1 && x % 4 < 2) || (y % 5 === 2 && x % 4 >= 2),
                leaf: (x + y) % 5 === 0,
                fire: (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0,
            }[color];

            if (on) {
                d += `M${x} ${y}h1v1h-1z`;
            }
        }
    }

    return d;
}

/** Pixel rectangle with the corners cut off. */
const rounded = (x: number, y: number, w: number, h: number) =>
    `M${x + 1} ${y}h${w - 2}v1h1v${h - 2}h-1v1h${-(w - 2)}v-1h-1v${-(h - 2)}h1z`;

/** The big symbol in the middle: sprite rows and their scale. */
function glyph(card: CardCode): { d: string; w: number; h: number } {
    const value = cardValue(card);

    if (value in DIGITS) {
        return { d: spritePath(DIGITS[value]), w: 3, h: 5 };
    }

    if (value === "draw2" || value === "wild4") {
        return {
            d:
                spritePath(PLUS, 0, 1) +
                spritePath(DIGITS[value === "draw2" ? "2" : "4"], 4, 0),
            w: 7,
            h: 5,
        };
    }

    return { d: spritePath(ICONS[value as "skip"]), w: 7, h: 7 };
}

function cornerGlyph(card: CardCode): string {
    const value = cardValue(card);

    if (value in DIGITS) {
        return spritePath(DIGITS[value]);
    }

    if (value === "draw2" || value === "wild4") {
        return (
            spritePath(PLUS, 0, 1) +
            spritePath(DIGITS[value === "draw2" ? "2" : "4"], 4, 0)
        );
    }

    return spritePath(SMALL_ICONS[value as "skip"]);
}

function Face({ card }: { card: CardCode }) {
    const color = cardColor(card);
    const big = glyph(card);
    // Digits 3× (9×15), the wider symbols 2× (14 wide); kept on the pixel grid
    const scale = big.w === 3 ? 3 : 2;
    const gx = Math.round(12 - (big.w * scale) / 2);
    const gy = Math.round(17 - (big.h * scale) / 2);
    const ink = color === "wild" ? "#0F1E3A" : CARD_COLORS[color].dark;
    const corner = cornerGlyph(card);

    return (
        <>
            {color === "wild" ? (
                // Colour change: the four colours, each with its own pattern
                (
                    [
                        ["sun", 2, 2],
                        ["sea", 12, 2],
                        ["leaf", 2, 17],
                        ["fire", 12, 17],
                    ] as const
                ).map(([c, x, y]) => (
                    <g key={c}>
                        <rect
                            x={x}
                            y={y}
                            width={10}
                            height={15}
                            fill={CARD_COLORS[c].fill}
                        />
                        <path
                            d={pattern(c, x, y, x + 10, y + 15)}
                            fill={CARD_COLORS[c].dark}
                            opacity={0.3}
                        />
                    </g>
                ))
            ) : (
                <>
                    <rect
                        x={2}
                        y={2}
                        width={20}
                        height={30}
                        fill={CARD_COLORS[color].fill}
                    />
                    <path
                        d={pattern(color, 2, 2, 22, 32)}
                        fill={CARD_COLORS[color].dark}
                        opacity={0.3}
                    />
                </>
            )}

            {/* Window in the middle with the big symbol */}
            <path d={rounded(4, 8, 16, 18)} fill="#0F1E3A" />
            <path d={rounded(5, 9, 14, 16)} fill="#FFFFFF" />
            <path
                d={big.d}
                fill={ink}
                transform={`translate(${gx} ${gy}) scale(${scale})`}
            />

            {/* Corners: value top left, colour shape bottom right (white with a dark shadow) */}
            <g transform="translate(3 2)">
                <path d={corner} fill="#0F1E3A" transform="translate(1 1)" />
                <path d={corner} fill="#FFFFFF" />
            </g>
            {color !== "wild" && (
                <g transform="translate(16 26)">
                    <path
                        d={spritePath(SHAPES[color])}
                        fill="#0F1E3A"
                        transform="translate(1 1)"
                    />
                    <path d={spritePath(SHAPES[color])} fill="#FFFFFF" />
                </g>
            )}
        </>
    );
}

/** The back: TribeLink navy with a diamond pattern and a "T" in the middle. */
function Back() {
    let diamonds = "";

    for (let y = 3; y < 31; y += 4) {
        for (let x = 3 + ((y - 3) % 8 === 0 ? 0 : 2); x < 21; x += 4) {
            diamonds += `M${x} ${y}h1v1h-1z`;
        }
    }

    return (
        <>
            <rect x={2} y={2} width={20} height={30} fill="#0F1E3A" />
            <path d={diamonds} fill="#2F6BFF" />
            <path
                d={spritePath(
                    [
                        "....##....",
                        "...####...",
                        "..######..",
                        ".########.",
                        "##########",
                        ".########.",
                        "..######..",
                        "...####...",
                        "....##....",
                    ],
                    7,
                    12,
                )}
                fill="#22D3EE"
            />
            <path
                d={spritePath(["####", ".##.", ".##.", ".##.", ".##."], 10, 14)}
                fill="#0F1E3A"
            />
        </>
    );
}

export const PixelCard = memo(function PixelCard({
    card,
    className,
}: {
    /** null: the back of a card. */
    card: CardCode | null;
    className?: string;
}) {
    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            shapeRendering="crispEdges"
            aria-hidden
            className={cn("block aspect-[24/34]", className)}
        >
            <path d={rounded(0, 0, W, H)} fill="#0F1E3A" />
            <path d={rounded(1, 1, W - 2, H - 2)} fill="#FFFFFF" />
            {card ? <Face card={card} /> : <Back />}
        </svg>
    );
});
