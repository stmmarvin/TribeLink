import { useState } from "react";
import type { ReactNode } from "react";
import { DIFFICULTY_LABELS, HOUSE_RULES } from "@/lib/cards";
import { cn } from "@/lib/utils";
import type { CardCode, CardDifficulty, CardHouseRule } from "@/types";
import { PixelCard } from "./pixel-card";

const DIFFICULTIES: CardDifficulty[] = ["easy", "normal", "hard"];
const RULES = Object.keys(HOUSE_RULES) as CardHouseRule[];

/** A small card per house rule, so you see what it is about. */
const RULE_CARDS: Record<CardHouseRule, CardCode> = {
    stacking: "sea:draw2",
    zero_seven: "leaf:7",
};

/**
 * Before you sit down at the card table, in two steps: 1. how good the NPCs
 * are, "Volgende", 2. the house rules. Is somebody already waiting, then
 * they decided both and you simply join them.
 */
export function JoinSteps({
    info,
    difficulty,
    rules,
    error,
    onDifficulty,
    onToggleRule,
    onJoin,
}: {
    info: { waiting: string[]; wins: number } | null;
    difficulty: CardDifficulty;
    rules: CardHouseRule[];
    error: boolean;
    onDifficulty: (difficulty: CardDifficulty) => void;
    onToggleRule: (rule: CardHouseRule) => void;
    onJoin: () => void;
}) {
    const [step, setStep] = useState<1 | 2>(1);
    const host = info?.waiting[0];

    if (info && host) {
        return (
            <>
                <div className="rounded-input border-2 border-blue bg-blue/10 p-3 text-center">
                    <p className="font-pixel text-[11px] text-blue-aa uppercase">
                        {info.waiting.length}{" "}
                        {info.waiting.length === 1
                            ? "speler wacht"
                            : "spelers wachten"}
                    </p>
                    <p className="mt-1 text-caption text-ink-secondary">
                        {info.waiting.map((u) => `@${u}`).join(", ")}. @{host}{" "}
                        koos het niveau en de huisregels: je ziet ze zodra je
                        aanschuift.
                    </p>
                </div>
                {error && <JoinError />}
                <PrimaryButton onClick={onJoin}>Aanschuiven</PrimaryButton>
            </>
        );
    }

    return (
        <>
            <Stepper step={step} />

            {step === 1 ? (
                <>
                    <p className="text-caption text-ink-secondary">
                        {info === null
                            ? "Even kijken wie er aan tafel zit…"
                            : "Je bent de eerste aan tafel: jij kiest hoe het potje gaat. Lege stoelen worden NPC’s."}
                    </p>
                    {/* Zelfde keuze als bij schaken (chess/join-popup.tsx), voor eenheid */}
                    <fieldset>
                        <legend className="mb-1.5 font-pixel text-[11px] text-ink-secondary uppercase">
                            Moeilijkheid NPC
                        </legend>
                        <div className="grid grid-cols-3 gap-1">
                            {DIFFICULTIES.map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    aria-pressed={difficulty === d}
                                    onClick={() => onDifficulty(d)}
                                    className={cn(
                                        "h-9 rounded-input border-2 font-pixel text-[10px] uppercase transition-colors",
                                        difficulty === d
                                            ? "border-blue bg-blue/10 text-blue-aa"
                                            : "border-line text-ink-secondary hover:bg-subtle",
                                    )}
                                >
                                    {DIFFICULTY_LABELS[d]}
                                </button>
                            ))}
                        </div>
                    </fieldset>
                    <PrimaryButton onClick={() => setStep(2)}>
                        Volgende →
                    </PrimaryButton>
                </>
            ) : (
                <>
                    <p className="text-caption text-ink-secondary">
                        Huisregels zijn optioneel.
                    </p>
                    <div className="flex flex-col gap-2">
                        {RULES.map((rule) => (
                            <RuleSwitch
                                key={rule}
                                rule={rule}
                                on={rules.includes(rule)}
                                onToggle={() => onToggleRule(rule)}
                            />
                        ))}
                    </div>
                    <p className="text-center font-pixel text-[10px] text-ink-muted uppercase">
                        Niveau: {DIFFICULTY_LABELS[difficulty]} ·{" "}
                        {rules.length === 0
                            ? "gewone regels"
                            : `${rules.length} huisregel${rules.length === 1 ? "" : "s"}`}
                    </p>
                    {error && <JoinError />}
                    <div className="grid grid-cols-[auto_1fr] gap-2">
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="h-10 rounded-pill border-[1.5px] border-line px-4 font-jakarta text-label text-ink-secondary hover:bg-subtle"
                        >
                            Terug
                        </button>
                        <PrimaryButton onClick={onJoin}>
                            Aan tafel gaan
                        </PrimaryButton>
                    </div>
                </>
            )}
        </>
    );
}

/** 1 Niveau — 2 Huisregels, with the current step filled in. */
function Stepper({ step }: { step: 1 | 2 }) {
    return (
        <ol className="flex items-center gap-2" aria-label="Stappen">
            {(["Niveau", "Huisregels"] as const).map((label, i) => {
                const n = i + 1;
                const done = step > n;
                const current = step === n;

                return (
                    <li
                        key={label}
                        aria-current={current ? "step" : undefined}
                        className="flex items-center gap-2"
                    >
                        {i > 0 && (
                            <span
                                aria-hidden
                                className={cn(
                                    "h-0.5 w-6 shrink-0",
                                    step > 1 ? "bg-blue" : "bg-line",
                                )}
                            />
                        )}
                        <span
                            className={cn(
                                "flex size-6 shrink-0 items-center justify-center border-2 font-pixel text-[11px]",
                                current && "border-blue bg-blue text-white",
                                done && "border-blue bg-blue/10 text-blue-aa",
                                !current &&
                                    !done &&
                                    "border-line text-ink-muted",
                            )}
                        >
                            {done ? "✓" : n}
                        </span>
                        <span
                            className={cn(
                                "font-pixel text-[10px] uppercase",
                                current ? "text-ink" : "text-ink-muted",
                            )}
                        >
                            {label}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

function RuleSwitch({
    rule,
    on,
    onToggle,
}: {
    rule: CardHouseRule;
    on: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={onToggle}
            className={cn(
                "flex items-center gap-3 rounded-input border-2 p-2.5 text-left transition-colors outline-none focus-visible:ring-4 focus-visible:ring-cyan",
                on ? "border-blue bg-blue/10" : "border-line hover:bg-subtle",
            )}
        >
            <PixelCard
                card={RULE_CARDS[rule]}
                className={cn(
                    "w-8 shrink-0 transition-transform motion-reduce:transition-none",
                    on ? "-rotate-6" : "opacity-60 grayscale",
                )}
            />
            <span className="min-w-0 flex-1 text-center font-jakarta text-label text-ink">
                {HOUSE_RULES[rule].label}
            </span>
            {/* Pixel-schakelaar */}
            <span
                aria-hidden
                className={cn(
                    "relative h-5 w-9 shrink-0 border-2 transition-colors",
                    on ? "border-blue bg-blue" : "border-ink-muted bg-subtle",
                )}
            >
                <span
                    className={cn(
                        "absolute top-0.5 size-3 bg-white shadow-[1px_1px_0_0_rgb(15_30_58/0.5)] transition-[left] motion-reduce:transition-none",
                        on ? "left-[18px]" : "left-0.5",
                    )}
                />
            </span>
        </button>
    );
}

export function PrimaryButton({
    onClick,
    children,
}: {
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="h-10 rounded-pill bg-brand-aa font-pixel text-[12px] text-white uppercase shadow-[3px_3px_0_0_rgb(15_30_58/0.85)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-brand active:translate-y-0 active:shadow-none motion-reduce:transition-none"
        >
            {children}
        </button>
    );
}

export function JoinError() {
    return (
        <p role="alert" className="text-caption text-[#B42318]">
            Dat lukte niet. Probeer het opnieuw.
        </p>
    );
}
