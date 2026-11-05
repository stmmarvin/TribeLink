import { icons } from "@/components/tribelink/icons";
import { cn } from "@/lib/utils";

/** Figma 3.4: dashed box "🔒 Banner – nog niet gedeeld". */
export function NotShared({
    label,
    className,
}: {
    label: string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "flex min-h-10 items-center justify-center gap-1.5 rounded-field border border-dashed border-line-dashed bg-subtle px-3 py-2.5 text-center type-caption text-ink-muted",
                className,
            )}
        >
            <img src={icons.lockMuted} alt="" width={8} height={8} />
            {label} – nog niet gedeeld
        </div>
    );
}
