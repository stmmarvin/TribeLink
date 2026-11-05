import { useEffect, useRef, useState } from "react";

const COLS = 16;
const ROWS = 10;
/** Blocks appear (or disappear) at random moments within this window. */
const SPREAD_MS = 520;
export const REDUCED_MS = 220;
const TONES = ["#0F1E3A", "#13264a", "#0b1730", "#1b3260"];

export const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Pixel dissolve between the Hotel and a game, over its (relative)
 * parent, so the sidebar and header stay visible: `cover`
 * fills the screen block by block (the page under it fades and blurs),
 * `reveal` takes the blocks away again on the new page. With
 * prefers-reduced-motion it is a short plain fade.
 */
export function PixelTransition({
    mode,
    onDone,
}: {
    mode: "cover" | "reveal";
    onDone?: () => void;
}) {
    const [reduced] = useState(prefersReducedMotion);
    const [blocks] = useState(() =>
        Array.from({ length: COLS * ROWS }, () => ({
            delay: Math.round(Math.random() * SPREAD_MS),
            tone: TONES[Math.floor(Math.random() * TONES.length)],
        })),
    );
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;

    useEffect(() => {
        const timer = window.setTimeout(
            () => onDoneRef.current?.(),
            reduced ? REDUCED_MS : SPREAD_MS + 140,
        );

        return () => window.clearTimeout(timer);
    }, [reduced]);

    const animation = mode === "cover" ? "pixel-on" : "pixel-off";

    return (
        <div
            aria-hidden
            className="pointer-events-auto absolute inset-0 z-[100]"
        >
            {mode === "cover" && (
                <div className="absolute inset-0 [animation:fade-in-soft_400ms_ease-out_both] backdrop-blur-[6px]" />
            )}
            {reduced ? (
                <div
                    className="absolute inset-0 bg-ink"
                    style={{
                        animation: `${mode === "cover" ? "fade-in-soft" : "pixel-off"} ${REDUCED_MS}ms ease-out both`,
                    }}
                />
            ) : (
                <div
                    className="absolute inset-0 grid"
                    style={{
                        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                    }}
                >
                    {blocks.map((block, i) => (
                        <span
                            key={i}
                            style={{
                                background: block.tone,
                                animation: `${animation} 90ms steps(2, end) ${block.delay}ms both`,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
