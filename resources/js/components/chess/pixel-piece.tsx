import type { PieceSymbol } from "chess.js";
import { cn } from "@/lib/utils";
import type { ChessColor } from "@/types";

/**
 * Pixel-art chess pieces in the Hotel style. Each sprite is a 12×12
 * silhouette ('o' = body, 'x' = detail such as the knight's eye); the dark
 * outline and the shading on the right edge are worked out from it, so all
 * pieces share one look.
 */
const SPRITES: Record<PieceSymbol, string[]> = {
    p: [
        "............",
        "............",
        ".....oo.....",
        "....oooo....",
        "....oooo....",
        ".....oo.....",
        "....oooo....",
        ".....oo.....",
        "....oooo....",
        "...oooooo...",
        "..oooooooo..",
        "............",
    ],
    r: [
        "............",
        "..oo.oo.oo..",
        "..oooooooo..",
        "...oooooo...",
        "...oooooo...",
        "...oooooo...",
        "...oooooo...",
        "...oooooo...",
        "..oooooooo..",
        "..oooooooo..",
        ".oooooooooo.",
        "............",
    ],
    n: [
        ".....oo.....",
        "....oooo....",
        "...ooxoooo..",
        "..oooooooo..",
        ".ooooooooo..",
        ".oo..ooooo..",
        ".....ooooo..",
        "....ooooo...",
        "...ooooooo..",
        "..oooooooo..",
        ".oooooooooo.",
        "............",
    ],
    b: [
        "............",
        ".....oo.....",
        "....oooo....",
        "...oooxoo...",
        "...oooooo...",
        "....oooo....",
        ".....oo.....",
        "....oooo....",
        "....oooo....",
        "...oooooo...",
        "..oooooooo..",
        "............",
    ],
    q: [
        "............",
        ".o...oo...o.",
        ".oo.oooo.oo.",
        "..oooooooo..",
        "..oooooooo..",
        "...oooooo...",
        "....oooo....",
        "....oooo....",
        "...oooooo...",
        "..oooooooo..",
        ".oooooooooo.",
        "............",
    ],
    k: [
        ".....oo.....",
        "....oooo....",
        ".....oo.....",
        "..oo.oo.oo..",
        ".oooooooooo.",
        ".oooooooooo.",
        "..oooooooo..",
        "...oooooo...",
        "...oooooo...",
        "..oooooooo..",
        ".oooooooooo.",
        "............",
    ],
};

const COLORS: Record<
    ChessColor,
    { fill: string; shade: string; outline: string; detail: string }
> = {
    white: {
        fill: "#FFFFFF",
        shade: "#C8DBFF",
        outline: "#0F1E3A",
        detail: "#0F1E3A",
    },
    black: {
        fill: "#2B3A5C",
        shade: "#16213A",
        outline: "#05070D",
        detail: "#F5F9FF",
    },
};

/** Sprite size including the 1px outline around the 12×12 silhouette. */
const SIZE = 14;

type Layer = "fill" | "shade" | "outline" | "detail";

/** One SVG path per colour layer, cached per piece type. */
const cache = new Map<PieceSymbol, Record<Layer, string>>();

function layers(type: PieceSymbol): Record<Layer, string> {
    const cached = cache.get(type);

    if (cached) {
        return cached;
    }

    const rows = SPRITES[type];
    const solid = (x: number, y: number) =>
        rows[y - 1]?.[x - 1] !== undefined && rows[y - 1][x - 1] !== ".";
    const paths: Record<Layer, string> = {
        fill: "",
        shade: "",
        outline: "",
        detail: "",
    };
    const add = (layer: Layer, x: number, y: number) => {
        paths[layer] += `M${x} ${y}h1v1h-1z`;
    };

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (solid(x, y)) {
                const ch = rows[y - 1][x - 1];
                add(
                    ch === "x" ? "detail" : solid(x + 1, y) ? "fill" : "shade",
                    x,
                    y,
                );
            } else if (
                solid(x - 1, y) ||
                solid(x + 1, y) ||
                solid(x, y - 1) ||
                solid(x, y + 1)
            ) {
                add("outline", x, y);
            }
        }
    }

    cache.set(type, paths);

    return paths;
}

export const PIECE_NAMES: Record<PieceSymbol, string> = {
    p: "pion",
    n: "paard",
    b: "loper",
    r: "toren",
    q: "dame",
    k: "koning",
};

export function PixelPiece({
    type,
    color,
    className,
}: {
    type: PieceSymbol;
    color: ChessColor;
    className?: string;
}) {
    const paths = layers(type);
    const palette = COLORS[color];

    return (
        <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            shapeRendering="crispEdges"
            aria-hidden
            className={cn("block", className)}
        >
            {(["outline", "fill", "shade", "detail"] as const).map((layer) => (
                <path key={layer} d={paths[layer]} fill={palette[layer]} />
            ))}
        </svg>
    );
}
