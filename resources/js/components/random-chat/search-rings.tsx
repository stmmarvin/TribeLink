import { Hand, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AvatarPreview } from "@/components/hotel/AvatarPreview";
import { loadLook } from "@/game/look";
import { randomLook } from "@/game/rooms";
import type { AvatarLook } from "@/game/types";
import { cn } from "@/lib/utils";

export type RingsMode = "idle" | "searching" | "static";

const SHUFFLE_MS = 700;

/** Pixel speech bubble with a hard outline, like the Hotel chat bubbles. */
function PixelBubble({
    children,
    tail,
    className,
}: {
    children: ReactNode;
    tail: "left" | "right" | "center";
    className?: string;
}) {
    return (
        <span
            className={cn(
                "absolute flex items-center justify-center rounded-[3px] border-2 border-ink bg-surface",
                className,
            )}
        >
            {children}
            <span
                className={cn(
                    "absolute -bottom-[5px] size-2 rotate-45 border-r-2 border-b-2 border-ink bg-inherit",
                    tail === "left" && "left-2",
                    tail === "right" && "right-2",
                    tail === "center" && "left-1/2 -translate-x-1/2",
                )}
            />
        </span>
    );
}

function TypingDots({ animated }: { animated: boolean }) {
    return (
        <span className="flex gap-[3px]">
            {[0, 1, 2].map((index) => (
                <span
                    key={index}
                    className={cn(
                        "size-1 bg-ink md:size-[5px]",
                        animated && "animate-pulse motion-reduce:animate-none",
                        animated &&
                            [
                                "",
                                "[animation-delay:200ms]",
                                "[animation-delay:400ms]",
                            ][index],
                    )}
                />
            ))}
        </span>
    );
}

/** The two students, drawn by the Hotel engine (same pixels as the game). */
function Duo({
    me,
    other,
    size,
    otherWaving,
    otherFaded,
    className,
}: {
    me: AvatarLook;
    other: AvatarLook;
    size: number;
    otherWaving: boolean;
    otherFaded: boolean;
    className?: string;
}) {
    return (
        <span
            className={cn(
                "absolute bottom-[9%] left-1/2 -translate-x-1/2 items-end gap-3 md:gap-5",
                className,
            )}
        >
            <AvatarPreview look={me} size={size} dir={3} />
            <AvatarPreview
                look={other}
                size={size}
                dir={5}
                waving={otherWaving}
                className={cn(
                    "transition-opacity duration-200",
                    otherFaded && "opacity-60",
                )}
            />
        </span>
    );
}

/**
 * Scene inside the ring, after the TribeLink illustration: you (left) and
 * another student (right) with pixel speech bubbles and a heart.
 * - idle: you say "…", they wave back
 * - searching: the other student keeps changing while you type "…"
 * - static (chat ended): the other student waves goodbye
 */
function ChatScene({ mode }: { mode: RingsMode }) {
    const [me] = useState(loadLook);
    const [other, setOther] = useState(randomLook);
    const searching = mode === "searching";

    useEffect(() => {
        if (
            !searching ||
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
            return;
        }

        const id = window.setInterval(() => setOther(randomLook()), SHUFFLE_MS);

        return () => window.clearInterval(id);
    }, [searching]);

    const bubble = "h-6 w-[34px] md:h-8 md:w-[46px]";

    return (
        <>
            {mode !== "static" && (
                <PixelBubble
                    tail="left"
                    className={cn(bubble, "top-[17%] left-[17%] md:left-[19%]")}
                >
                    <TypingDots animated={searching} />
                </PixelBubble>
            )}
            {mode !== "searching" && (
                <PixelBubble
                    tail="right"
                    className={cn(
                        bubble,
                        "top-[17%] right-[17%] md:right-[19%]",
                    )}
                >
                    <Hand
                        aria-hidden="true"
                        className="size-4 fill-sunshine text-sunshine-dark md:size-5"
                    />
                </PixelBubble>
            )}
            {mode !== "static" && (
                <PixelBubble
                    tail="center"
                    className={cn(
                        "top-[38%] left-1/2 size-5 -translate-x-1/2 border-brand-teal-dark bg-brand-cyan md:size-7",
                        searching && "animate-pulse motion-reduce:animate-none",
                    )}
                >
                    <Heart
                        aria-hidden="true"
                        className="size-2.5 fill-sunshine text-sunshine md:size-3.5"
                    />
                </PixelBubble>
            )}

            <Duo
                me={me}
                other={other}
                size={46}
                otherWaving={mode !== "searching"}
                otherFaded={searching}
                className="flex md:hidden"
            />
            <Duo
                me={me}
                other={other}
                size={60}
                otherWaving={mode !== "searching"}
                otherFaded={searching}
                className="hidden md:flex"
            />
        </>
    );
}

/**
 * Figma 2.3 "Avatar" rings: the brand-gradient ring inside a dashed ring
 * (mobile), filled with the chat scene. While searching the rings turn and a
 * soft halo pulses; idle the ring breathes. Respects reduced motion.
 * Larger than Figma (96/160px): 168px mobile, 220px desktop, so the two
 * avatars stay legible.
 */
export function SearchRings({ mode }: { mode: RingsMode }) {
    const searching = mode === "searching";

    return (
        <span
            aria-hidden="true"
            className="relative inline-flex items-center justify-center p-[18px] md:p-0"
        >
            <span
                className={cn(
                    "absolute inset-0 rounded-full border-[1.5px] border-dashed border-brand/40 md:hidden",
                    mode !== "static" &&
                        "animate-spin [animation-direction:reverse] motion-reduce:animate-none",
                    searching
                        ? "[animation-duration:8s]"
                        : "[animation-duration:20s]",
                )}
            />
            {searching && (
                <span className="absolute inset-[6px] animate-pulse rounded-full bg-brand/10 [animation-duration:1.6s] motion-reduce:hidden md:-inset-4" />
            )}
            <span className="relative inline-flex rounded-full">
                {/* Only the gradient ring turns; the scene stays upright. */}
                <span
                    className={cn(
                        "absolute inset-0 rounded-full bg-brand-gradient",
                        searching &&
                            "animate-spin [animation-duration:2.5s] motion-reduce:animate-none",
                        mode === "idle" &&
                            "animate-pulse [animation-duration:3s] motion-reduce:animate-none",
                    )}
                />
                <span className="relative m-[2px] size-[164px] overflow-hidden rounded-full bg-linear-to-b from-surface to-media-tint md:m-[3px] md:size-[214px]">
                    <ChatScene mode={mode} />
                </span>
            </span>
        </span>
    );
}

/** Figma 2.3 progress dots; the highlight runs along while searching. */
export function SearchDots() {
    return (
        <span aria-hidden="true" className="flex gap-1.5">
            {[0, 1, 2].map((index) => (
                <span
                    key={index}
                    className={cn(
                        "size-2 rounded-full motion-safe:animate-pulse motion-safe:bg-brand",
                        index === 0 ? "bg-brand" : "bg-disabled",
                        [
                            "",
                            "[animation-delay:250ms]",
                            "[animation-delay:500ms]",
                        ][index],
                    )}
                />
            ))}
        </span>
    );
}
