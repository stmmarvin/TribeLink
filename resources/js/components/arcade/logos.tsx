import { cn } from "@/lib/utils";

/** Little pixel tower, the logo of Stack. */
function StackLogo({ className }: { className?: string }) {
    const layers = ["#7C5CFF", "#5B6BFF", "#2F6BFF", "#22A6EE", "#22D3EE"];

    return (
        <div
            aria-hidden
            className={cn("flex flex-col-reverse items-center", className)}
        >
            {layers.map((color, i) => (
                <span
                    key={color}
                    className="-mb-0.5 block h-2.5 border-2 border-ink"
                    style={{
                        background: color,
                        width: 44 - i * 4,
                        transform: `translateX(${i % 2 ? 3 : -2}px)`,
                    }}
                />
            ))}
        </div>
    );
}

/**
 * Pixel jetski over a wave, the logo of Wave Rush. Every `#` is one pixel of
 * the drawing; the letters pick the colour.
 */
const JETSKI = [
    ".......kk.......",
    "......kcck......",
    ".....kccwk......",
    ".kkkkkkkkkkkkk..",
    "kwwwwwwwwwwwwwk.",
    ".kttttttttttttk.",
    "..kkkkkkkkkkkk..",
];
const WAVE = [
    "ff..........ff..",
    "bbff......ffbbff",
    "bbbbffffffbbbbbb",
    "dddddddddddddddd",
];
const COLORS: Record<string, string> = {
    k: "#0F1E3A",
    c: "#22D3EE",
    w: "#FFFFFF",
    t: "#14B8A6",
    f: "#E0F7FF",
    b: "#22A6EE",
    d: "#0E7490",
};

function WaveRushLogo({ className }: { className?: string }) {
    const rows = [...JETSKI, ...WAVE];

    return (
        <svg
            aria-hidden
            viewBox={`0 0 16 ${rows.length}`}
            shapeRendering="crispEdges"
            className={cn("mx-auto h-14 w-20", className)}
        >
            {rows.flatMap((row, y) =>
                row
                    .split("")
                    .map((pixel, x) =>
                        COLORS[pixel] ? (
                            <rect
                                key={`${x}-${y}`}
                                x={x}
                                y={y}
                                width="1"
                                height="1"
                                fill={COLORS[pixel]}
                            />
                        ) : null,
                    ),
            )}
        </svg>
    );
}

/** The logo of an arcade game (config/arcade.php key). */
export function ArcadeLogo({
    game,
    className,
}: {
    game: string;
    className?: string;
}) {
    return game === "wave-rush" ? (
        <WaveRushLogo className={className} />
    ) : (
        <StackLogo className={className} />
    );
}
