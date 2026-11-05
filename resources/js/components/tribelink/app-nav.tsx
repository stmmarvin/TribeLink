import { create as feedCreate } from "@/routes/feed";
import { Link, router, usePage } from "@inertiajs/react";
import type { InertiaLinkProps } from "@inertiajs/react";
import { useEffect, useId, useRef, useState } from "react";
import { useCurrentUrl } from "@/hooks/use-current-url";
import { usernameFor } from "@/lib/user";
import { cn } from "@/lib/utils";
import { dashboard, feed, logout, ontmoeten } from "@/routes";
import { edit as editProfile, show as showProfile } from "@/routes/profile";
import { index as berichten } from "@/routes/chats";
import { Avatar } from "./avatar";
import { ButtonLink } from "./button";
import { icons, navIcons } from "./icons";
import { Monitor, Moon, Sun } from "lucide-react";
import type { Appearance } from "@/hooks/use-appearance";
import { useAppearance } from "@/hooks/use-appearance";
import type { NavIconName } from "./icons";
import { Logo } from "./logo";

type NavItem = {
    label: string;
    icon: NavIconName;
    /** Items without href are designed in Figma but not built yet. */
    href?: NonNullable<InertiaLinkProps["href"]>;
    /** Extra URL prefixes that should mark this item active. */
    activeFor?: string[];
};

const navItems: NavItem[] = [
    { label: "Home", icon: "home", href: dashboard() },
    { label: "Ontmoeten", icon: "users", href: ontmoeten() },
    { label: "Feed", icon: "grid", href: feed() },
    {
        label: "Profiel",
        icon: "user",
        href: showProfile(),
        activeFor: ["/settings"],
    },
];

function useIsActive() {
    const { isCurrentOrParentUrl, currentUrl } = useCurrentUrl();

    return (item: NavItem) =>
        !!item.href &&
        (isCurrentOrParentUrl(item.href) ||
            !!item.activeFor?.some((prefix) => currentUrl.startsWith(prefix)));
}

/** Icon that swaps between the Default / Hover / Active Figma exports. */
function NavIcon({
    name,
    active,
    size = 24,
}: {
    name: NavIconName;
    active: boolean;
    size?: number;
}) {
    const variant = navIcons[name];

    return active ? (
        <img src={variant.active} alt="" width={size} height={size} />
    ) : (
        <span
            className="relative inline-flex"
            style={{ width: size, height: size }}
        >
            <img
                src={variant.default}
                alt=""
                width={size}
                height={size}
                className="group-hover:opacity-0"
            />
            <img
                src={variant.hover}
                alt=""
                width={size}
                height={size}
                className="absolute inset-0 opacity-0 group-hover:opacity-100"
            />
        </span>
    );
}

const themeOptions = [
    { value: "light", icon: Sun, label: "Licht" },
    { value: "dark", icon: Moon, label: "Donker" },
    { value: "system", icon: Monitor, label: "Systeem" },
] as const;

export function ThemeToggle() {
    const { appearance, updateAppearance } = useAppearance();

    return (
        <div className="flex gap-1 rounded-field border border-line bg-subtle p-1">
            {themeOptions.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    type="button"
                    aria-label={label}
                    aria-pressed={appearance === value}
                    onClick={() => updateAppearance(value as Appearance)}
                    className={
                        appearance === value
                            ? "flex flex-1 justify-center rounded-md bg-surface py-1.5 text-ink shadow-card"
                            : "flex flex-1 justify-center rounded-md py-1.5 text-ink-muted hover:text-ink"
                    }
                >
                    <Icon className="size-4" />
                </button>
            ))}
        </div>
    );
}
/** Desktop sidebar (Figma "Sidebar", 240px). */
export function Sidebar() {
    const isActive = useIsActive();

    return (
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-7 border-r border-line bg-surface px-4 pt-7 pb-5 lg:flex">
            <Logo size="md" className="self-start px-2" />
            <nav aria-label="Hoofdnavigatie">
                <ul className="flex flex-col gap-1">
                    {navItems.map((item) => {
                        const active = isActive(item);
                        const classes = cn(
                            "group relative flex w-full items-center gap-3 rounded-field px-3.5 py-2.5 font-display text-sm focus-ring transition-colors",
                            active
                                ? "bg-brand/10 leading-[18px] font-bold text-brand-aa"
                                : "leading-[1.4] font-semibold text-ink-secondary hover:bg-subtle hover:text-ink",
                        );
                        const content = (
                            <>
                                <NavIcon name={item.icon} active={active} />
                                {item.label}
                                {active && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-[3px] bg-brand-gradient"
                                    />
                                )}
                            </>
                        );

                        return (
                            <li key={item.label}>
                                {item.href ? (
                                    <Link
                                        href={item.href}
                                        className={classes}
                                        aria-current={
                                            active ? "page" : undefined
                                        }
                                    >
                                        {content}
                                    </Link>
                                ) : (
                                    <span
                                        className={cn(
                                            classes,
                                            "cursor-default",
                                        )}
                                        aria-disabled="true"
                                        title="Binnenkort beschikbaar"
                                    >
                                        {content}
                                        <span className="sr-only">
                                            (binnenkort)
                                        </span>
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </nav>
            <ButtonLink href={feedCreate()} fullWidth>
                Nieuwe post
            </ButtonLink>
            <div className="flex-1" />
            <ThemeToggle />
            <ProfileMenu />
        </aside>
    );
}

/** Mobile/tablet bottom tab bar (Figma "Background+HorizontalBorder", 68px). */
export function BottomNav() {
    const isActive = useIsActive();

    return (
        <nav
            aria-label="Hoofdnavigatie"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-nav-up lg:hidden"
        >
            <ul className="mx-auto flex h-[68px] max-w-xl items-stretch justify-around pt-1.5">
                {navItems.map((item) => {
                    const active = isActive(item);
                    const classes = cn(
                        "group relative flex h-full flex-col items-center justify-center gap-[3px] font-display text-xs focus-ring",
                        active
                            ? "leading-[15.4px] font-bold text-brand-aa"
                            : "leading-[1.5] font-semibold text-ink-secondary",
                    );
                    const content = (
                        <>
                            {active && (
                                <span
                                    aria-hidden="true"
                                    className="absolute -top-[7px] left-1/2 h-[3px] w-7 -translate-x-1/2 rounded-[3px] bg-brand-gradient"
                                />
                            )}
                            <NavIcon name={item.icon} active={active} />
                            {/* Icons only on mobile; the label stays for screen readers. */}
                            <span className="sr-only">{item.label}</span>
                        </>
                    );

                    return (
                        <li key={item.label} className="w-[78px]">
                            {item.href ? (
                                <Link
                                    href={item.href}
                                    className={classes}
                                    aria-current={active ? "page" : undefined}
                                >
                                    {content}
                                </Link>
                            ) : (
                                <span
                                    className={classes}
                                    aria-disabled="true"
                                    title="Binnenkort beschikbaar"
                                >
                                    {content}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

/**
 * Menu icons have different native sizes (20/15/10px); a fixed 20px slot keeps
 * the labels aligned.
 */
function MenuIcon({ src, size }: { src: string; size: number }) {
    return (
        <span className="flex size-5 shrink-0 items-center justify-center">
            <img src={src} alt="" width={size} height={size} />
        </span>
    );
}

/** Figma "Profile" footer + "Overlay – Profiel menu". */
function ProfileMenu() {
    const { auth } = usePage().props;
    const [open, setOpen] = useState(false);
    const menuId = useId();
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onPointerDown = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
                triggerRef.current?.focus();
            }
        };

        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    const itemClasses =
        "flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-logo px-3 type-label text-ink transition-colors hover:bg-subtle active:bg-brand/10 focus-ring";
    const username = `@${usernameFor(auth.user)}`;

    return (
        <div ref={containerRef} className="relative">
            <div
                id={menuId}
                role="menu"
                aria-label="Profielmenu"
                hidden={!open}
                className="absolute bottom-[calc(100%+12px)] left-0 z-40 flex w-60 flex-col gap-0.5 rounded-card border border-line bg-surface p-2 shadow-card"
            >
                <Link
                    href={showProfile()}
                    role="menuitem"
                    className={itemClasses}
                >
                    <MenuIcon src={icons.menuUser} size={20} />
                    Mijn profiel
                </Link>
                <Link
                    href={berichten()}
                    role="menuitem"
                    className={itemClasses}
                >
                    <MenuIcon src={icons.menuUsers} size={20} />
                    Bewaarde contacten
                </Link>
                <Link
                    href={editProfile()}
                    role="menuitem"
                    className={itemClasses}
                >
                    <MenuIcon src={icons.image} size={15} />
                    Profiel bewerken
                </Link>
                <Link
                    href={logout()}
                    as="button"
                    role="menuitem"
                    onClick={() => router.flushAll()}
                    className={cn(itemClasses, "text-danger-text")}
                >
                    <MenuIcon src={icons.lockError} size={10} />
                    Uitloggen
                </Link>
            </div>
            <div className="flex items-center gap-2.5 border-t border-line px-2 pt-4">
                <Avatar
                    name={auth.user.name}
                    src={auth.user.avatar}
                    size={40}
                />
                <div className="flex min-w-0 flex-1 flex-col leading-[18px]">
                    <span className="truncate font-display text-sm font-bold text-ink">
                        {username}
                    </span>
                    <span className="type-caption leading-[18px] text-ink-muted">
                        Mijn profiel
                    </span>
                </div>
                <button
                    ref={triggerRef}
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={open}
                    aria-controls={menuId}
                    aria-label="Profielmenu openen"
                    onClick={() => setOpen((value) => !value)}
                    className="flex size-8 cursor-pointer items-center justify-center rounded-logo font-display text-base font-bold text-ink-secondary focus-ring transition-colors hover:bg-subtle active:bg-brand/10"
                >
                    <span aria-hidden="true">⋯</span>
                </button>
            </div>
        </div>
    );
}
