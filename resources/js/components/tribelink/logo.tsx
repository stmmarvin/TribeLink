import { Link } from "@inertiajs/react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { home } from "@/routes";
import logoIcon from "../../../images/logo/tribelink-icon.svg";
import logoMark from "../../../images/logo/tribelink-mark.svg";

type MarkSize = "sm" | "md" | "lg";

const markSizes: Record<MarkSize, string> = {
    sm: "size-8 shadow-cta",
    md: "size-9 shadow-cta",
    lg: "size-16 shadow-logo",
};

/** The TribeLink app icon (rounded square with the T–link–L mark). */
export function LogoMark({
    size = "sm",
    className,
}: {
    size?: MarkSize;
    className?: string;
}) {
    return (
        <img
            src={logoIcon}
            alt=""
            width={512}
            height={512}
            className={cn("shrink-0 rounded-[22%]", markSizes[size], className)}
        />
    );
}

/** The full-colour T–link–L mark without background (e.g. the landing hero). */
export function LogoSymbol({ className }: { className?: string }) {
    return (
        <img
            src={logoMark}
            alt=""
            width={1080}
            height={580}
            className={cn("h-auto shrink-0", className)}
        />
    );
}

/** "TRIBELINK" in the pixel font, dark navy like the logo sheet. */
export function Wordmark({ className }: { className?: string }) {
    return (
        <span className={cn("type-logo text-xl text-ink", className)}>
            TribeLink
        </span>
    );
}

/** Mark + wordmark, linking home. Hover/pressed states per Figma "Desktop/Hover/Logo". */
export function Logo({
    size = "sm",
    href = home(),
    className,
}: {
    size?: Exclude<MarkSize, "lg">;
    href?: ComponentProps<typeof Link>["href"];
    className?: string;
}) {
    return (
        <Link
            href={href}
            className={cn(
                "inline-flex items-center gap-2.5 rounded-logo focus-ring transition-colors hover:bg-brand/10 active:bg-brand/15",
                className,
            )}
        >
            <LogoMark size={size} />
            <Wordmark />
            <span className="sr-only">– naar de startpagina</span>
        </Link>
    );
}
