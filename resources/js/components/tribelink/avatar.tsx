import { cn } from "@/lib/utils";

type AvatarProps = {
    /** Accessible name, e.g. the username. */
    name: string;
    src?: string | null;
    /** Diameter in px. Figma uses 32, 36, 40, 44, 80 and 112. */
    size?: number;
    className?: string;
};

/**
 * Figma "Avatar": a circle with the brand-gradient ring (2px, 3px from 80px up)
 * and a white fill. Shows the user's photo when available.
 */
export function Avatar({ name, src, size = 40, className }: AvatarProps) {
    const ring = size >= 80 ? 3 : 2;

    return (
        <span
            className={cn(
                "inline-flex shrink-0 rounded-full bg-brand-gradient",
                className,
            )}
            style={{ width: size, height: size, padding: ring }}
        >
            <span className="block size-full overflow-hidden rounded-full bg-surface">
                {src ? (
                    <img
                        src={src}
                        alt={`Profielfoto van ${name}`}
                        className="size-full object-cover"
                    />
                ) : (
                    <span className="sr-only">{`Avatar van ${name}`}</span>
                )}
            </span>
        </span>
    );
}
