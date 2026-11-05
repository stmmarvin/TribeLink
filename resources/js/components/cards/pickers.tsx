import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { CARD_COLORS, COLOR_ORDER } from "@/lib/cards";
import type { CardColor, CardSeat } from "@/types";
import { PixelCard } from "./pixel-card";

/** Card of each colour, to show its pattern and shape in the colour picker. */
const SAMPLE: Record<CardColor, `${CardColor}:5`> = {
    sun: "sun:5",
    sea: "sea:5",
    leaf: "leaf:5",
    fire: "fire:5",
};

function Picker({
    title,
    onCancel,
    children,
}: {
    title: string;
    onCancel: () => void;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);

    // Focus the first choice; Esc goes back to your hand
    useEffect(() => {
        ref.current?.querySelector("button")?.focus();
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
        window.addEventListener("keydown", onKey);

        return () => window.removeEventListener("keydown", onKey);
    }, []);

    return (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-ink/60 p-4">
            <section
                ref={ref}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="w-full max-w-sm [animation:fade-in-soft_180ms_ease-out_both] overflow-hidden rounded-card border-4 border-ink bg-surface shadow-[6px_6px_0_0_rgb(15_30_58)]"
            >
                <header className="bg-brand px-4 py-2.5">
                    <h2 className="font-pixel text-[13px] tracking-wide text-white uppercase">
                        {title}
                    </h2>
                </header>
                <div className="flex flex-col gap-3 p-4">
                    {children}
                    <button
                        type="button"
                        onClick={onCancel}
                        className="h-10 rounded-pill border-[1.5px] border-line font-jakarta text-label text-ink-secondary hover:bg-subtle"
                    >
                        Terug naar je hand
                    </button>
                </div>
            </section>
        </div>
    );
}

/** After a colour change: which colour is next? Colour, name, shape and pattern. */
export function ColorPicker({
    counts,
    onPick,
    onCancel,
}: {
    /** How many cards of each colour you hold, as a hint. */
    counts: Record<CardColor, number>;
    onPick: (color: CardColor) => void;
    onCancel: () => void;
}) {
    return (
        <Picker title="Kies een kleur" onCancel={onCancel}>
            <div className="grid grid-cols-2 gap-2">
                {COLOR_ORDER.map((color) => (
                    <button
                        key={color}
                        type="button"
                        onClick={() => onPick(color)}
                        className="flex items-center gap-3 rounded-input border-4 p-2 text-left outline-none hover:brightness-105 focus-visible:ring-4 focus-visible:ring-cyan"
                        style={{
                            borderColor: CARD_COLORS[color].dark,
                            background: CARD_COLORS[color].light,
                        }}
                    >
                        <PixelCard card={SAMPLE[color]} className="w-9" />
                        <span className="flex flex-col">
                            <span className="font-pixel text-[13px] text-ink uppercase">
                                {CARD_COLORS[color].name}
                            </span>
                            <span className="text-caption text-ink-secondary">
                                {counts[color]} in je hand
                            </span>
                        </span>
                    </button>
                ))}
            </div>
        </Picker>
    );
}

/** 0/7 rule, after a 7: who do you swap hands with? */
export function SwapPicker({
    seats,
    onPick,
    onCancel,
}: {
    seats: CardSeat[];
    onPick: (seat: number) => void;
    onCancel: () => void;
}) {
    return (
        <Picker title="Ruil je hand met…" onCancel={onCancel}>
            <div className="flex flex-col gap-2">
                {seats.map((seat) => (
                    <button
                        key={seat.seat}
                        type="button"
                        onClick={() => onPick(seat.seat)}
                        className="flex h-11 items-center justify-between rounded-input border-2 border-line px-3 font-jakarta text-label text-ink outline-none hover:bg-subtle focus-visible:ring-4 focus-visible:ring-cyan"
                    >
                        <span>
                            {seat.isNpc
                                ? `🤖 ${seat.username}`
                                : `@${seat.username}`}
                        </span>
                        <span className="font-pixel text-[12px] text-ink-secondary">
                            {seat.cardCount}{" "}
                            {seat.cardCount === 1 ? "kaart" : "kaarten"}
                        </span>
                    </button>
                ))}
            </div>
        </Picker>
    );
}
