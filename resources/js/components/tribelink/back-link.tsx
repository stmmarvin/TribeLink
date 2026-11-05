import { Link } from "@inertiajs/react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Href = ComponentProps<typeof Link>["href"];

/** Desktop "‹ Terug" link (Figma "Desktop/Hover/Terug"). */
export function BackLink({
    href,
    onClick,
    className,
}: {
    href?: Href;
    onClick?: () => void;
    className?: string;
}) {
    const classes = cn(
        "-mx-1 inline-flex cursor-pointer items-center gap-1.5 self-start rounded-logo px-1 focus-ring transition-colors hover:bg-brand/10 active:bg-brand/15",
        className,
    );
    const content = (
        <>
            <span
                aria-hidden="true"
                className="font-display text-lg leading-[23px] font-bold text-ink"
            >
                ‹
            </span>
            <span className="type-small text-ink-secondary">Terug</span>
        </>
    );

    return href ? (
        <Link href={href} className={classes}>
            {content}
        </Link>
    ) : (
        <button type="button" onClick={onClick} className={classes}>
            {content}
        </button>
    );
}

/**
 * Mobile screen header: back chevron left, centred title (Figma mobile frames,
 * 44px high, 32px / 1fr / 32px grid). `action` fills the right 32px slot.
 */
export function MobileHeader({
    title,
    backHref,
    onBack,
    action,
    children,
    className,
}: {
    title: ReactNode;
    backHref?: Href;
    onBack?: () => void;
    action?: ReactNode;
    children?: ReactNode;
    className?: string;
}) {
    const backClasses =
        "flex size-8 cursor-pointer items-center justify-start rounded-logo text-[32px] leading-none text-ink transition-colors hover:text-brand-aa focus-ring";

    return (
        <div
            className={cn(
                "grid min-h-11 grid-cols-[32px_minmax(0,1fr)_32px] items-center",
                className,
            )}
        >
            {backHref ? (
                <Link
                    href={backHref}
                    className={backClasses}
                    aria-label="Terug"
                >
                    <span aria-hidden="true">‹</span>
                </Link>
            ) : onBack ? (
                <button
                    type="button"
                    onClick={onBack}
                    className={backClasses}
                    aria-label="Terug"
                >
                    <span aria-hidden="true">‹</span>
                </button>
            ) : (
                <span />
            )}
            <div className="col-start-2 flex flex-col items-center gap-px text-center">
                <h1 className="truncate font-display text-xl leading-[22.4px] font-bold text-ink">
                    {title}
                </h1>
                {children}
            </div>
            {action && (
                <div className="col-start-3 flex justify-end">{action}</div>
            )}
        </div>
    );
}
