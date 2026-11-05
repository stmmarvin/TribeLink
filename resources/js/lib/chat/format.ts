import type { ContactStatus, Message } from "@/types/chat";

export const statusLabels: Record<ContactStatus, string> = {
    saved: "Bewaard",
    partial: "Deels zichtbaar",
    friend: "Vriend",
};

const timeFormat = new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
});
const dayMonthFormat = new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
});
const weekdayFormat = new Intl.DateTimeFormat("nl-NL", { weekday: "short" });

function startOfDay(date: Date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);

    return copy;
}

function daysAgo(date: Date, now = new Date()) {
    return Math.round(
        (startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000,
    );
}

/** "14:05" */
export function formatTime(iso: string) {
    return timeFormat.format(new Date(iso));
}

/** Day separator label: "Vandaag", "Gisteren" or "12 sep". */
export function formatDayLabel(iso: string) {
    const days = daysAgo(new Date(iso));

    if (days === 0) {
        return "Vandaag";
    }

    if (days === 1) {
        return "Gisteren";
    }

    return dayMonthFormat.format(new Date(iso)).replace(".", "");
}

/** Short timestamp for the conversation list: time, weekday or date. */
export function formatListTimestamp(iso: string) {
    const days = daysAgo(new Date(iso));

    if (days === 0) {
        return formatTime(iso);
    }

    if (days < 7) {
        return weekdayFormat.format(new Date(iso)).replace(".", "");
    }

    return dayMonthFormat.format(new Date(iso)).replace(".", "");
}

export type MessageGroup = {
    key: string;
    /** Separator text shown above the group. */
    label: string;
    messages: Message[];
};

/**
 * Groups messages per calendar day. Days older than a week get the Figma
 * "Eerdere chat · 12 sep" label.
 */
export function groupMessagesByDay(messages: Message[]): MessageGroup[] {
    const groups: MessageGroup[] = [];

    for (const message of messages) {
        const key = startOfDay(new Date(message.sentAt)).toISOString();
        const last = groups.at(-1);

        if (last?.key === key) {
            last.messages.push(message);
            continue;
        }

        const label = formatDayLabel(message.sentAt);
        groups.push({
            key,
            label:
                daysAgo(new Date(message.sentAt)) > 7
                    ? `Eerdere chat · ${label}`
                    : label,
            messages: [message],
        });
    }

    return groups;
}
