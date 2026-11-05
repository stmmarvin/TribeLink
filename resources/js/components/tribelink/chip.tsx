import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ChipVariant = "saved" | "partial" | "friend" | "neutral" | "brand";

// Figma "Chip": status colours from the Tints + AA text tokens.
const variants: Record<ChipVariant, string> = {
    saved: "bg-brand-teal/15 text-brand-teal-dark",
    partial: "bg-sunshine/15 text-sunshine-dark",
    friend: "bg-brand-aa text-white",
    brand: "bg-brand-aa text-white",
    neutral: "bg-subtle text-ink-secondary",
};

export function Chip({
    variant = "neutral",
    children,
    className,
}: {
    variant?: ChipVariant;
    children: ReactNode;
    className?: string;
}) {
    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center rounded-full px-2.5 py-[3px] font-display text-xs leading-[18px] font-semibold whitespace-nowrap",
                variants[variant],
                className,
            )}
        >
            {children}
        </span>
    );
}
