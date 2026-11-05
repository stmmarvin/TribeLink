import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { cardLabel } from "@/lib/cards";
import { cn } from "@/lib/utils";
import type { CardCode } from "@/types";
import { PixelCard } from "./pixel-card";

/**
 * Your own hand as a fan at the bottom of the table. Cards you may play
 * now light up and lift; the others are dimmed. Every card is a button:
 * click or tap it, or walk through the hand with ← → and play with Enter.
 */
export function Hand({
    hand,
    playable,
    drawn,
    disabled,
    onPlay,
}: {
    /** Already sorted. */
    hand: CardCode[];
    playable: CardCode[];
    drawn: CardCode | null;
    disabled: boolean;
    onPlay: (card: CardCode) => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const n = hand.length;
    const angle = Math.min(6, 48 / Math.max(n, 1));
    // The same code twice: give each copy its own key
    const seen = new Map<CardCode, number>();
    const keys = hand.map((card) => {
        const i = seen.get(card) ?? 0;
        seen.set(card, i + 1);

        return `${card}#${i}`;
    });

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
            return;
        }

        const buttons = [
            ...(ref.current?.querySelectorAll("button") ?? []),
        ] as HTMLButtonElement[];
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next =
            buttons[
                Math.max(
                    0,
                    Math.min(
                        buttons.length - 1,
                        at + (e.key === "ArrowRight" ? 1 : -1),
                    ),
                )
            ];
        e.preventDefault();
        next?.focus();
    };

    return (
        <div
            ref={ref}
            role="group"
            aria-label={`Jouw hand: ${n} ${n === 1 ? "kaart" : "kaarten"}`}
            onKeyDown={onKeyDown}
            className="flex min-h-32 items-end justify-center overflow-x-auto overflow-y-hidden px-6 pt-8 pb-4 [scrollbar-width:none] sm:min-h-40 [&::-webkit-scrollbar]:hidden"
        >
            {hand.map((card, i) => {
                const offset = i - (n - 1) / 2;
                const canPlay = !disabled && playable.includes(card);
                const isNew = drawn === card;

                return (
                    <button
                        key={keys[i]}
                        type="button"
                        aria-label={`${cardLabel(card)}${canPlay ? "" : ", past nu niet"}`}
                        aria-disabled={!canPlay}
                        // Only the first card is in the tab order; arrows walk through the rest
                        tabIndex={i === 0 ? 0 : -1}
                        onClick={() => canPlay && onPlay(card)}
                        className={cn(
                            "group relative shrink-0 [animation:fade-in-soft_250ms_ease-out_both] rounded-[6px] outline-none",
                            n > 1 &&
                                i > 0 &&
                                (n > 9
                                    ? "-ml-11 sm:-ml-12"
                                    : n > 6
                                      ? "-ml-8 sm:-ml-9"
                                      : "-ml-5"),
                            "focus-visible:z-20 focus-visible:ring-4 focus-visible:ring-cyan",
                            canPlay ? "cursor-pointer" : "cursor-default",
                        )}
                        style={{
                            transform: `rotate(${offset * angle}deg) translateY(${Math.abs(offset) ** 2 * 0.9}px)`,
                            transformOrigin: "50% 140%",
                        }}
                    >
                        <span
                            className={cn(
                                "block transition-transform duration-150 motion-reduce:transition-none",
                                canPlay
                                    ? "-translate-y-3 group-hover:-translate-y-6 group-focus-visible:-translate-y-6"
                                    : "brightness-75 saturate-50",
                            )}
                        >
                            <PixelCard
                                card={card}
                                className={cn(
                                    "w-16 sm:w-20",
                                    canPlay
                                        ? "drop-shadow-[0_0_6px_#22D3EE]"
                                        : "opacity-70",
                                )}
                            />
                            {isNew && (
                                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-pill bg-sunshine px-1.5 font-pixel text-[9px] text-ink uppercase">
                                    Nieuw
                                </span>
                            )}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
