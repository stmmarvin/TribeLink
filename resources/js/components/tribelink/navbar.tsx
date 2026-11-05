import { Menu, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

/**
 * Public top bar (Figma "Top bar": 72px, bottom border, 120px side padding on
 * desktop). Below 768px the actions collapse behind a hamburger button.
 */
export function Navbar({
    actions,
    mobileMenu,
    className,
}: {
    /** Shown inline from md up. */
    actions?: ReactNode;
    /** Shown in the collapsible menu below md. Omit to hide the hamburger. */
    mobileMenu?: ReactNode;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const menuId = useId();

    useEffect(() => {
        if (!open) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
            }
        };

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open]);

    return (
        <header className={cn("w-full border-b border-line", className)}>
            <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-5 md:h-[72px] md:px-10 xl:px-[120px]">
                <Logo />
                <div className="flex-1" />
                {actions && (
                    <div className="hidden items-center gap-3 md:flex">
                        {actions}
                    </div>
                )}
                {mobileMenu && (
                    <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={menuId}
                        aria-label={open ? "Menu sluiten" : "Menu openen"}
                        onClick={() => setOpen((value) => !value)}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-field border border-line bg-surface text-ink focus-ring transition-colors hover:bg-brand/10 active:bg-brand/15 md:hidden"
                    >
                        {open ? (
                            <X className="size-5" aria-hidden="true" />
                        ) : (
                            <Menu className="size-5" aria-hidden="true" />
                        )}
                    </button>
                )}
            </div>
            {mobileMenu && (
                <nav
                    id={menuId}
                    aria-label="Hoofdmenu"
                    hidden={!open}
                    className="border-t border-line bg-surface px-5 py-4 md:hidden"
                >
                    <div className="flex flex-col gap-2.5">{mobileMenu}</div>
                </nav>
            )}
        </header>
    );
}
