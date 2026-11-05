import { cn } from "@/lib/utils";

/**
 * A "+" drawn with two bars, so it is optically centred in round/square
 * buttons (the "+" glyph of the font sits off-centre in its line box).
 * Uses `currentColor`.
 */
export function PlusIcon({
    size = 14,
    thickness = 2,
    className,
}: {
    size?: number;
    thickness?: number;
    className?: string;
}) {
    return (
        <span
            aria-hidden="true"
            className={cn("relative block shrink-0", className)}
            style={{ width: size, height: size }}
        >
            <span
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full bg-current"
                style={{ height: thickness }}
            />
            <span
                className="absolute inset-y-0 left-1/2 -translate-x-1/2 rounded-full bg-current"
                style={{ width: thickness }}
            />
        </span>
    );
}
