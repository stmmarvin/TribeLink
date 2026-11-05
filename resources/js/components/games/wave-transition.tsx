import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion, REDUCED_MS } from "./pixel-transition";

const DURATION_MS = 760;
/** Rows of the pixel wave edge (the SVG is stretched to the full height). */
const EDGE_ROWS = 40;

/** Stepped (pixel) wave edge: per row how far the water reaches, two crests over the height. */
const EDGE = Array.from({ length: EDGE_ROWS }, (_, row) =>
    Math.round(4 + 3 * Math.sin((row / EDGE_ROWS) * Math.PI * 4)),
);

/**
 * A pixel wave that washes over its (relative) parent, between the Arcade and
 * Wave Rush: `cover` sweeps the water in from the left, `reveal` washes it out
 * to the right on the new page. With prefers-reduced-motion it is a short
 * plain fade, like PixelTransition.
 */
export function WaveTransition({
    mode,
    onDone,
}: {
    mode: "cover" | "reveal";
    onDone?: () => void;
}) {
    const [reduced] = useState(prefersReducedMotion);
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;

    useEffect(() => {
        const timer = window.setTimeout(
            () => onDoneRef.current?.(),
            reduced ? REDUCED_MS : DURATION_MS + 80,
        );

        return () => window.clearTimeout(timer);
    }, [reduced]);

    if (reduced) {
        return (
            <div
                aria-hidden
                className="pointer-events-auto absolute inset-0 z-[100] bg-[#0E7490]"
                style={{
                    animation: `${mode === "cover" ? "fade-in-soft" : "pixel-off"} ${REDUCED_MS}ms ease-out both`,
                }}
            />
        );
    }

    return (
        <div
            aria-hidden
            className="pointer-events-auto absolute inset-0 z-[100] overflow-hidden"
        >
            <div
                className="absolute inset-y-0 left-0 flex w-[calc(100%+96px)]"
                style={{
                    animation: `${mode === "cover" ? "wave-in" : "wave-out"} ${DURATION_MS}ms steps(14, end) both`,
                }}
            >
                <div className="flex-1 bg-[linear-gradient(#22D3EE,#0E7490_45%,#0F1E3A)]" />
                <svg
                    viewBox={`0 0 10 ${EDGE_ROWS}`}
                    preserveAspectRatio="none"
                    shapeRendering="crispEdges"
                    className="h-full w-24 shrink-0"
                >
                    <defs>
                        {/* In SVG units, so every 1px row picks up its own colour */}
                        <linearGradient
                            id="wave-water"
                            gradientUnits="userSpaceOnUse"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2={EDGE_ROWS}
                        >
                            <stop offset="0" stopColor="#22D3EE" />
                            <stop offset="0.45" stopColor="#0E7490" />
                            <stop offset="1" stopColor="#0F1E3A" />
                        </linearGradient>
                    </defs>
                    {EDGE.map((reach, row) => (
                        <g key={row}>
                            <rect
                                x="0"
                                y={row}
                                width={reach}
                                height="1.05"
                                fill="url(#wave-water)"
                            />
                            {/* Foam on the crest */}
                            <rect
                                x={reach}
                                y={row}
                                width="1"
                                height="1.05"
                                fill="#E0F7FF"
                            />
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
}
