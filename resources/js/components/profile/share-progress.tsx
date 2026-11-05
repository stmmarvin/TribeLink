import { Card } from "@/components/tribelink/card";

function Bar({
    label,
    value,
    total,
}: {
    label: string;
    value: number;
    total: number;
}) {
    return (
        <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 type-caption text-ink-secondary">
                {label}
            </span>
            <div
                role="progressbar"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={value}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle"
            >
                <div
                    className="h-full rounded-full bg-brand transition-[width] duration-300"
                    style={{ width: `${(value / total) * 100}%` }}
                />
            </div>
        </div>
    );
}

/** "Jij hebt 4 van 6 gedeeld – de ander 2 van 6" (Figma 3.3). */
export function ShareProgress({
    mine,
    theirs,
    total,
}: {
    mine: number;
    theirs: number;
    total: number;
}) {
    return (
        <Card className="flex flex-col gap-2.5 p-4">
            <p
                className="font-display text-sm leading-5 font-bold text-ink"
                aria-live="polite"
            >
                Jij hebt {mine} van {total} gedeeld – de ander {theirs} van{" "}
                {total}
            </p>
            <Bar label="Jij" value={mine} total={total} />
            <Bar label="De ander" value={theirs} total={total} />
        </Card>
    );
}
