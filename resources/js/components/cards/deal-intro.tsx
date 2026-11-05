import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { prefersReducedMotion } from "@/components/games/pixel-transition";
import { PixelCard } from "./pixel-card";
import { ANCHORS } from "./table-layout";
import type { SeatSide } from "./table-layout";

const SHUFFLE_MS = 1100;
const DEAL_STAGGER_MS = 55;
const FLY_MS = 380;

/**
 * Right after the Hotel faded away: the deck in the middle of the table is
 * shuffled (riffled a few times), then the cards fly to every seat one by
 * one, like a dealer would. Without motion it is skipped.
 */
export function DealIntro({
    sides,
    handSize,
    onDone,
}: {
    /** Seats in dealing order. */
    sides: SeatSide[];
    handSize: number;
    onDone: () => void;
}) {
    const [reduced] = useState(prefersReducedMotion);
    const [phase, setPhase] = useState<"shuffle" | "deal">("shuffle");
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;
    const total = handSize * sides.length;

    useEffect(() => {
        if (reduced) {
            onDoneRef.current();

            return;
        }

        const toDeal = window.setTimeout(() => setPhase("deal"), SHUFFLE_MS);
        const done = window.setTimeout(
            () => onDoneRef.current(),
            SHUFFLE_MS + total * DEAL_STAGGER_MS + FLY_MS,
        );

        return () => {
            window.clearTimeout(toDeal);
            window.clearTimeout(done);
        };
    }, [reduced]);

    if (reduced) {
        return null;
    }

    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-20">
            <p className="absolute top-[30%] left-1/2 -translate-x-1/2 animate-perfect-pop font-pixel text-[13px] whitespace-nowrap text-white uppercase [animation-duration:1200ms] [text-shadow:2px_2px_0_#0F1E3A]">
                {phase === "shuffle" ? "Schudden…" : "Delen…"}
            </p>

            {phase === "shuffle" ? (
                <div
                    className="absolute"
                    style={{ left: ANCHORS.pile.x, top: "50%" }}
                >
                    <div className="relative -translate-x-1/2 -translate-y-1/2">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <span
                                key={i}
                                className="absolute top-0 left-0"
                                // Left and right half riffle into each other, three times
                                style={
                                    {
                                        "--riffle": i % 2 ? "75%" : "-75%",
                                        "--riffle-r":
                                            i % 2 ? "10deg" : "-10deg",
                                        animation: `card-riffle ${SHUFFLE_MS / 3}ms steps(6, end) ${i * 25}ms 3 both`,
                                        marginTop: -i,
                                    } as CSSProperties
                                }
                            >
                                <PixelCard
                                    card={null}
                                    className="w-14 sm:w-16"
                                />
                            </span>
                        ))}
                        <PixelCard
                            card={null}
                            className="invisible w-14 sm:w-16"
                        />
                    </div>
                </div>
            ) : (
                Array.from({ length: total }, (_, i) => {
                    const side = sides[i % sides.length];

                    return (
                        <div
                            key={i}
                            className="absolute"
                            style={
                                {
                                    "--from-x": ANCHORS.pile.x,
                                    "--from-y": ANCHORS.pile.y,
                                    "--to-x": ANCHORS[side].x,
                                    "--to-y": ANCHORS[side].y,
                                    "--to-r": `${(i % 5) * 9 - 18}deg`,
                                    "--to-s": side === "bottom" ? 1 : 0.6,
                                    left: ANCHORS[side].x,
                                    top: ANCHORS[side].y,
                                    transform: "translate(-50%, -50%)",
                                    animation: `card-fly ${FLY_MS}ms cubic-bezier(0.3, 0.7, 0.4, 1) ${i * DEAL_STAGGER_MS}ms both, pixel-off 1ms linear ${i * DEAL_STAGGER_MS + FLY_MS + 60}ms both`,
                                } as CSSProperties
                            }
                        >
                            <PixelCard card={null} className="w-12 sm:w-14" />
                        </div>
                    );
                })
            )}
        </div>
    );
}
