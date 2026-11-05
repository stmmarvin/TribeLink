import { Link } from "@inertiajs/react";
import type { ComponentProps, ReactNode } from "react";
import { Avatar } from "@/components/tribelink/avatar";
import { ButtonLink } from "@/components/tribelink/button";
import { Card } from "@/components/tribelink/card";
import { Chip } from "@/components/tribelink/chip";
import { EmptyState } from "@/components/tribelink/empty-state";
import { statusLabels } from "@/lib/chat/format";
import { randomChat } from "@/routes/ontmoeten";
import { cn } from "@/lib/utils";
import type { Contact, Room } from "@/types";

type Href = ComponentProps<typeof Link>["href"];

const linkClasses =
    "rounded-sm type-label text-ink underline underline-offset-2 transition-colors hover:text-brand-aa focus-ring";

/** Figma "Section header": bold title with an optional underlined link. */
export function SectionHeader({
    title,
    linkLabel,
    href,
    as: Heading = "h2",
}: {
    title: string;
    linkLabel?: string;
    href?: Href;
    as?: "h2" | "h3";
}) {
    return (
        <div className="flex items-center gap-2">
            <Heading className="flex-1 font-display text-base leading-[19.6px] font-bold text-ink md:leading-[21px]">
                {title}
            </Heading>
            {linkLabel && href && (
                <Link
                    href={href}
                    className={cn(linkClasses, "text-base md:text-sm")}
                >
                    {linkLabel}
                </Link>
            )}
        </div>
    );
}

/** White sidebar card with a section header (Nu online, Bewaarde contacten…). */
export function WidgetCard({
    title,
    linkLabel,
    href,
    children,
    className,
}: {
    title: string;
    linkLabel?: string;
    href?: Href;
    children: ReactNode;
    className?: string;
}) {
    return (
        <Card className={cn("flex flex-col gap-3 p-4", className)}>
            <section className="flex flex-col gap-3">
                <SectionHeader
                    title={title}
                    linkLabel={linkLabel}
                    href={href}
                    as="h3"
                />
                {children}
            </section>
        </Card>
    );
}

/** Contact row: avatar, @name, optional subtitle and status chip. */
export function ContactRow({
    contact,
    href,
    showSubtitle = true,
    action,
}: {
    contact: Contact;
    href?: Href;
    showSubtitle?: boolean;
    action?: ReactNode;
}) {
    const content = (
        <>
            <Avatar name={contact.username} src={contact.avatarUrl} size={32} />
            <div className="flex min-w-0 flex-1 flex-col gap-px leading-[18px]">
                <span className="truncate font-display text-sm font-bold text-ink">
                    @{contact.username}
                </span>
                {showSubtitle && contact.subtitle && (
                    <span className="truncate type-caption leading-[18px] text-ink-muted">
                        {contact.subtitle}
                    </span>
                )}
            </div>
            <Chip variant={contact.status}>{statusLabels[contact.status]}</Chip>
            {action}
        </>
    );
    const classes =
        "-mx-2 flex items-center gap-2.5 rounded-field px-2 py-1 transition-colors";

    return href ? (
        <Link
            href={href}
            className={cn(
                classes,
                "focus-ring hover:bg-subtle active:bg-brand/10",
            )}
        >
            {content}
        </Link>
    ) : (
        <div className={classes}>{content}</div>
    );
}

/** Lobby room row (Figma "Lobby · 4 ruimtes"). */
export function RoomRow({ room }: { room: Room }) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="relative size-9 shrink-0 overflow-hidden rounded-logo bg-media-tint">
                {room.imageUrl ? (
                    <img
                        src={room.imageUrl}
                        alt=""
                        className="size-full object-cover"
                    />
                ) : (
                    <span className="absolute inset-0 bg-brand-gradient opacity-25" />
                )}
            </span>
            <span className="min-w-0 flex-1 truncate font-display text-sm leading-[18px] font-bold text-ink">
                {room.name}
            </span>
            {room.peopleCount !== null && (
                <span className="shrink-0 type-caption leading-[18px] text-ink-muted">
                    {room.peopleCount}{" "}
                    {room.peopleCount === 1 ? "persoon" : "mensen"}
                </span>
            )}
        </div>
    );
}

/** "– online" when the count is unknown, otherwise "38 online". */
export function onlineLabel(count: number | null | undefined) {
    return `Random chat · ${count ?? "–"} online`;
}

/** Figma "Nu online" card; the button opens Random chat (2.3). */
export function OnlineWidget({ onlineCount }: { onlineCount?: number | null }) {
    return (
        <WidgetCard title="Nu online">
            <p className="flex items-center gap-2.5 type-small text-ink-secondary">
                <span
                    aria-hidden="true"
                    className={cn(
                        "size-2 shrink-0 rounded-full",
                        onlineCount ? "bg-brand-aa" : "bg-ink-muted",
                    )}
                />
                {onlineLabel(onlineCount)}
            </p>
            <ButtonLink href={randomChat()} size="md" fullWidth>
                Start random chat
            </ButtonLink>
        </WidgetCard>
    );
}

/** Figma "Lobby · 4 ruimtes" card with dividers between rooms. */
export function RoomsWidget({ rooms }: { rooms: Room[] }) {
    return (
        <WidgetCard title={`Lobby · ${rooms.length} ruimtes`}>
            {rooms.length === 0 ? (
                <EmptyState
                    variant="inline"
                    title="Er zijn nog geen ruimtes open."
                />
            ) : (
                <ul className="flex flex-col divide-y divide-line">
                    {rooms.map((room) => (
                        <li
                            key={room.id}
                            className="py-2.5 first:pt-0 last:pb-0"
                        >
                            <RoomRow room={room} />
                        </li>
                    ))}
                </ul>
            )}
        </WidgetCard>
    );
}

/** "Bewaarde contacten" card (Home, Feed, Profiel). */
export function ContactsWidget({
    contacts,
    href,
    contactHref,
    title = "Bewaarde contacten",
    emptyText = "Je hebt nog geen bewaarde contacten.",
    limit = 3,
    showSubtitle = true,
}: {
    contacts: Contact[];
    href?: Href;
    contactHref?: (contact: Contact) => Href;
    title?: string;
    emptyText?: string;
    limit?: number;
    showSubtitle?: boolean;
}) {
    return (
        <WidgetCard title={title} linkLabel="Alles" href={href}>
            {contacts.length === 0 ? (
                <EmptyState variant="inline" title={emptyText} />
            ) : (
                <ul className="flex flex-col gap-3">
                    {contacts.slice(0, limit).map((contact) => (
                        <li key={contact.id}>
                            <ContactRow
                                contact={contact}
                                href={contactHref?.(contact)}
                                showSubtitle={showSubtitle}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </WidgetCard>
    );
}
