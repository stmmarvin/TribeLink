// Dutch date/time formatting shared by posts and chats.

const relative = new Intl.RelativeTimeFormat("nl-NL", { numeric: "auto" });

/** "2 uur geleden", "gisteren", "3 dagen geleden" */
export function formatRelative(iso: string, now = new Date()) {
    const seconds = Math.round(
        (new Date(iso).getTime() - now.getTime()) / 1000,
    );
    const steps: [Intl.RelativeTimeFormatUnit, number][] = [
        ["second", 60],
        ["minute", 60],
        ["hour", 24],
        ["day", 7],
        ["week", 4.35],
        ["month", 12],
        ["year", Infinity],
    ];
    let value = seconds;

    for (const [unit, size] of steps) {
        if (Math.abs(value) < size) {
            return relative.format(Math.round(value), unit);
        }

        value /= size;
    }

    return relative.format(Math.round(value), "year");
}

/** Time-of-day greeting: Goedemorgen / Goedemiddag / Goedenavond. */
export function greeting(date = new Date()) {
    const hour = date.getHours();

    if (hour < 6) {
        return "Goedenacht";
    }

    if (hour < 12) {
        return "Goedemorgen";
    }

    return hour < 18 ? "Goedemiddag" : "Goedenavond";
}
