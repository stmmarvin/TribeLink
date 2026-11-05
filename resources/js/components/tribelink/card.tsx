import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type CardProps = ComponentProps<"div"> & {
    /** "panel" = auth/modal panel (20px radius), "card" = content card (16px). */
    variant?: "card" | "panel";
    /** Adds the Figma hover/pressed states of clickable cards. */
    interactive?: boolean;
};

/** Card styles, for elements that cannot be a <div> (e.g. a <button>). */
export function cardClasses({
    variant = "card",
    interactive = false,
}: Pick<CardProps, "variant" | "interactive"> = {}) {
    return cn(
        "border border-line bg-surface shadow-card",
        variant === "panel" ? "rounded-panel" : "rounded-card",
        interactive &&
            "cursor-pointer transition-[border-color,box-shadow,background-color] hover:border-brand hover:shadow-card-hover active:bg-subtle",
    );
}

export function Card({
    variant = "card",
    interactive = false,
    className,
    ...props
}: CardProps) {
    return (
        <div
            className={cn(cardClasses({ variant, interactive }), className)}
            {...props}
        />
    );
}
