import { Link } from "@inertiajs/react";
import type { ComponentProps, ReactNode } from "react";
import { BottomNav, Sidebar } from "@/components/tribelink/app-nav";
import type { BreadcrumbItem } from "@/types";

/**
 * TribeLink app shell: 240px sidebar from lg (1024px) up, bottom tab bar on
 * mobile and tablet — as in the Figma desktop and mobile HiFi frames.
 */
export default function AppLayout({
    children,
}: {
    /** Kept for compatibility with existing pages; not shown in this design. */
    breadcrumbs?: BreadcrumbItem[];
    children: ReactNode;
}) {
    return (
        <div className="min-h-dvh bg-app font-body text-ink lg:flex">
            <Sidebar />
            <div className="flex min-h-dvh min-w-0 flex-1 flex-col pb-[calc(68px+env(safe-area-inset-bottom))] lg:pb-0">
                {children}
            </div>
            <BottomNav />
        </div>
    );
}

/** Desktop page header (Figma "Header": 72px, white, bottom border). */
export function PageHeader({
    title,
    eyebrow,
    afterTitle,
    actions,
    backHref,
}: {
    title: string;
    /** Shows the boxed "‹" back button before the title (Figma 3.3). */
    backHref?: ComponentProps<typeof Link>["href"];
    /** Small line above the title, e.g. "Goedemiddag" on Home. */
    eyebrow?: ReactNode;
    /** Shown right after the title, e.g. the room chip in the Lobby. */
    afterTitle?: ReactNode;
    actions?: ReactNode;
}) {
    return (
        <header className="hidden h-[72px] shrink-0 items-center gap-3.5 border-b border-line bg-surface px-10 lg:flex xl:px-[72px]">
            {backHref && (
                <Link
                    href={backHref}
                    aria-label="Terug"
                    className="flex size-[34px] shrink-0 items-center justify-center rounded-field border border-line bg-surface font-display text-lg leading-none font-bold text-ink focus-ring transition-colors hover:bg-brand/10"
                >
                    <span aria-hidden="true">‹</span>
                </Link>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                {eyebrow && (
                    <p className="type-caption leading-[18px] text-ink-muted">
                        {eyebrow}
                    </p>
                )}
                <div className="flex min-w-0 items-center gap-3">
                    <h1 className="truncate type-h2 text-ink">{title}</h1>
                    {afterTitle}
                </div>
            </div>
            {actions}
        </header>
    );
}
