import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Empty state in the TribeLink style.
 * - `inline`: one muted line, for small widget cards ("Nog geen vrienden").
 * - `block`: centred icon tile + title + text, for main lists and panels.
 */
export function EmptyState({
    title,
    text,
    icon,
    variant = "block",
    action,
    className,
}: {
    title: string;
    text?: string;
    /** Icon from `icons.ts` at its native size, shown in a 56px tint tile. */
    icon?: { src: string; size: number };
    variant?: "inline" | "block";
    action?: ReactNode;
    className?: string;
}) {
    if (variant === "inline") {
        return (
            <p className={cn("type-small text-ink-muted", className)}>
                {title}
            </p>
        );
    }

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center gap-2 px-6 py-8 text-center",
                className,
            )}
        >
            {icon && (
                <span className="mb-1 flex size-14 items-center justify-center rounded-field bg-brand/10">
                    <img
                        src={icon.src}
                        alt=""
                        width={icon.size}
                        height={icon.size}
                    />
                </span>
            )}
            <p className="font-display text-base leading-[21px] font-bold text-ink">
                {title}
            </p>
            {text && (
                <p className="max-w-xs type-small text-ink-secondary">{text}</p>
            )}
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}
