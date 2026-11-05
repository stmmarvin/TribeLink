import type { InertiaLinkProps } from "@inertiajs/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BackLink, MobileHeader } from "./back-link";

/**
 * Shared shell of the auth screens.
 * - Mobile: full-height column, back chevron + centred title (Figma 390 frames).
 * - md+: centred 480px white panel with "‹ Terug" and an H2 (Figma desktop frames).
 */
export function AuthPanel({
    title,
    backHref,
    children,
    className,
}: {
    title: string;
    backHref?: InertiaLinkProps["href"];
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className="flex flex-1 flex-col md:items-center md:justify-center md:px-10 md:py-12">
            <div
                className={cn(
                    "flex flex-1 flex-col gap-3.5 px-5 pt-1 pb-5 md:w-[480px] md:flex-none md:gap-5 md:rounded-panel md:border md:border-line md:bg-surface md:p-10 md:shadow-card",
                    className,
                )}
            >
                <MobileHeader
                    title={title}
                    backHref={backHref}
                    className="md:hidden"
                />
                <div className="hidden flex-col gap-5 md:flex">
                    {backHref && <BackLink href={backHref} />}
                    <h1 className="type-h2 text-ink">{title}</h1>
                </div>
                {children}
            </div>
        </div>
    );
}

/** Small centred text with an inline link, e.g. "Nog geen account? Registreren". */
export function AuthFooterText({ children }: { children: ReactNode }) {
    return (
        <p className="text-center type-caption text-ink-secondary">
            {children}
        </p>
    );
}

/** Link style of "Wachtwoord vergeten?" / "Registreren" (Figma hover: Ocean Blue AA). */
export const authLinkClasses =
    "font-display font-bold text-ink underline underline-offset-2 transition-colors hover:text-brand-aa active:opacity-80 focus-ring rounded-sm";
