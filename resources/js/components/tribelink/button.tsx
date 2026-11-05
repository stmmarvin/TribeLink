import { Link } from "@inertiajs/react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
    "primary" | "secondary" | "ghost" | "danger" | "danger-outline";
/** `compact` = 38px CTA used in the mobile frames (e.g. 3.1b). */
export type ButtonSize = "lg" | "compact" | "md" | "sm";

type StyleProps = {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
};

// Sizes follow the Figma "Desktop/Button" component: L 48px, M 40px, S 36px.
const sizeClasses: Record<ButtonSize, string> = {
    lg: "h-12 px-6 rounded-btn type-button",
    compact: "h-[38px] px-4 rounded-btn type-label",
    md: "h-10 px-5 rounded-field type-label",
    sm: "h-9 px-4 rounded-full type-label",
};

// Default / Hover / Pressed per variant, as defined in Figma.
const variantClasses: Record<
    ButtonVariant,
    Record<Exclude<ButtonSize, "compact">, string>
> = {
    primary: {
        lg: "bg-brand-aa text-white shadow-cta hover:bg-brand hover:shadow-cta-hover active:opacity-90 active:shadow-pressed",
        md: "bg-brand-aa text-white hover:bg-brand hover:shadow-cta active:bg-brand-aa/85 active:shadow-none",
        sm: "bg-brand-aa text-white hover:bg-brand hover:shadow-cta active:bg-brand-aa/85 active:shadow-none",
    },
    secondary: {
        lg: "border-[1.5px] border-brand bg-surface text-brand-aa hover:bg-brand/10 active:bg-brand/15",
        md: "border-[1.5px] border-brand bg-surface text-brand-aa hover:bg-brand/10 active:bg-brand/15",
        sm: "border-[1.5px] border-brand bg-surface text-brand-aa hover:bg-brand/10 active:bg-brand/15",
    },
    ghost: {
        lg: "text-ink-secondary hover:bg-subtle active:bg-brand/10 active:text-brand-aa",
        md: "text-ink-secondary hover:bg-subtle active:bg-brand/10 active:text-brand-aa",
        sm: "text-ink-secondary hover:bg-subtle active:bg-brand/10 active:text-brand-aa",
    },
    // Not in Figma: destructive actions (account delete) use the Error tokens.
    danger: {
        lg: "bg-danger-text text-white hover:bg-danger active:opacity-90",
        md: "bg-danger-text text-white hover:bg-danger active:opacity-90",
        sm: "bg-danger-text text-white hover:bg-danger active:opacity-90",
    },
    // Quiet destructive action: opens a confirmation, so it should not shout.
    "danger-outline": {
        lg: "border-[1.5px] border-danger/35 bg-surface text-danger-text hover:border-danger/60 hover:bg-danger-surface active:bg-danger-surface",
        md: "border-[1.5px] border-danger/35 bg-surface text-danger-text hover:border-danger/60 hover:bg-danger-surface active:bg-danger-surface",
        sm: "border-[1.5px] border-danger/35 bg-surface text-danger-text hover:border-danger/60 hover:bg-danger-surface active:bg-danger-surface",
    },
};

// Figma "Type=Disabled": subtle surface, border, secondary text.
const disabledClasses =
    "disabled:cursor-not-allowed disabled:border disabled:border-line disabled:bg-subtle disabled:bg-none disabled:text-ink-secondary disabled:opacity-100 disabled:shadow-none";

export function buttonClasses({
    variant = "primary",
    size = "lg",
    fullWidth = false,
}: StyleProps = {}) {
    return cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap focus-ring transition-[background-color,box-shadow,color,opacity] duration-150",
        sizeClasses[size],
        variantClasses[variant][size === "compact" ? "lg" : size],
        disabledClasses,
        fullWidth && "w-full",
    );
}

type ButtonProps = ComponentProps<"button"> & StyleProps;

export function Button({
    variant,
    size,
    fullWidth,
    className,
    type = "button",
    ...props
}: ButtonProps) {
    return (
        <button
            type={type}
            className={cn(
                buttonClasses({ variant, size, fullWidth }),
                className,
            )}
            {...props}
        />
    );
}

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "size"> & StyleProps;

export function ButtonLink({
    variant,
    size,
    fullWidth,
    className,
    ...props
}: ButtonLinkProps) {
    return (
        <Link
            className={cn(
                buttonClasses({ variant, size, fullWidth }),
                className,
            )}
            {...props}
        />
    );
}

export function Spinner({ className }: { className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                "size-4 animate-spin rounded-full border-2 border-current border-r-transparent",
                className,
            )}
        />
    );
}
