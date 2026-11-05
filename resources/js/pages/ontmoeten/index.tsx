import { Head, Link, usePage } from "@inertiajs/react";
import { MessagesSquare } from "lucide-react";
import type { ReactNode } from "react";
import { OnlineWidget, RoomsWidget } from "@/components/content/widgets";
import { MobileHeader } from "@/components/tribelink/back-link";
import { cardClasses } from "@/components/tribelink/card";
import { meetIcons } from "@/components/tribelink/icons";
import { PageHeader } from "@/layouts/app-layout";
import { cn } from "@/lib/utils";
import { index as berichten } from "@/routes/chats";
import { lobby, randomChat } from "@/routes/ontmoeten";
import type { Conversation, Room } from "@/types";

type Props = {
    conversations?: Conversation[];
    rooms?: Room[];
    onlineCount?: number | null;
};

type Option = {
    title: string;
    text: string;
    icon: keyof typeof meetIcons;
    tint: string;
    href?: string;
};

const iconSizes = { chat: 58.8, mail: 93.3333, game: 58.8, qr: 58.8 };

const cardLayout =
    "flex w-full items-center gap-3.5 p-3.5 text-left focus-ring md:h-full md:flex-col md:items-stretch md:gap-3.5 md:p-5";

function OptionContent({
    title,
    text,
    tint,
    smallIcon,
    largeIcon,
    badge,
}: {
    title: string;
    text: string;
    tint: string;
    smallIcon: ReactNode;
    largeIcon: ReactNode;
    badge?: ReactNode;
}) {
    return (
        <>
            <span
                className={cn(
                    "flex size-14 shrink-0 items-center justify-center rounded-field md:hidden",
                    tint,
                )}
            >
                {smallIcon}
            </span>
            <span
                className={cn(
                    "hidden h-[140px] items-center justify-center overflow-hidden rounded-card md:flex",
                    tint,
                )}
            >
                {largeIcon}
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 md:gap-1">
                    <span className="flex items-center gap-2 font-display text-base leading-[19.6px] font-bold text-ink md:leading-[21px]">
                        {title}
                        {badge}
                    </span>
                    <span className="type-caption text-ink-secondary md:leading-[18px]">
                        {text}
                    </span>
                </span>
                <span
                    aria-hidden="true"
                    className="text-base text-ink-secondary md:font-display md:text-lg md:font-bold md:text-ink"
                >
                    ›
                </span>
            </span>
        </>
    );
}

function OptionCard({ option }: { option: Option }) {
    const icon = meetIcons[option.icon];
    const content = (
        <OptionContent
            title={option.title}
            text={option.text}
            tint={option.tint}
            smallIcon={<img src={icon.sm} alt="" width={25.2} height={25.2} />}
            largeIcon={
                <img
                    src={icon.lg}
                    alt=""
                    width={iconSizes[option.icon]}
                    height={iconSizes[option.icon]}
                />
            }
        />
    );

    if (option.href) {
        return (
            <Link
                href={option.href}
                className={cn(cardClasses({ interactive: true }), cardLayout)}
            >
                {content}
            </Link>
        );
    }

    return (
        <button
            type="button"
            aria-disabled="true"
            title="Binnenkort beschikbaar"
            className={cn(
                cardClasses({ interactive: true }),
                cardLayout,
                "cursor-default",
            )}
        >
            {content}
            <span className="sr-only">(binnenkort beschikbaar)</span>
        </button>
    );
}

function MessagesCard({ unread }: { unread: number }) {
    return (
        <Link
            href={berichten()}
            className={cn(cardClasses({ interactive: true }), cardLayout)}
        >
            <OptionContent
                title="Berichten"
                text="Je gesprekken en contacten"
                tint="bg-coral/15"
                smallIcon={
                    <MessagesSquare
                        aria-hidden="true"
                        className="size-[25px] text-coral"
                    />
                }
                largeIcon={
                    <MessagesSquare
                        aria-hidden="true"
                        className="size-[59px] text-coral"
                    />
                }
                badge={
                    unread > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-aa px-1.5 text-xs leading-none font-bold text-white">
                            {unread > 9 ? "9+" : unread}
                            <span className="sr-only"> ongelezen</span>
                        </span>
                    )
                }
            />
        </Link>
    );
}

export default function OntmoetenIndex({
    conversations = [],
    rooms = [],
    onlineCount = null,
}: Props) {
    const { auth } = usePage().props;

    const options: Option[] = [
        {
            title: "Random chat",
            text: "Praat met iemand die nu online is",
            icon: "chat",
            tint: "bg-brand/10",
            href: randomChat.url(),
        },
        {
            title: "Hotel",
            text: "Loop rond in een virtuele ruimte en speel samen een spel",
            icon: "game",
            tint: "bg-brand-teal/15",
            href: lobby.url(),
        },
        {
            title: "Poster",
            text: "Maak een poster met QR-code",
            icon: "qr",
            tint: "bg-brand-cyan/15",
            href: `/profile/${auth.user.id}/poster`,
        },
    ];

    const unread = conversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
    );

    return (
        <>
            <Head title="Ontmoeten" />
            <PageHeader title="Ontmoeten" />

            <div className="flex flex-1 gap-6 px-5 pt-1 pb-8 md:px-10 md:py-8 xl:px-[72px]">
                <div className="flex min-w-0 flex-1 flex-col gap-3.5 md:gap-6">
                    <MobileHeader title="Ontmoeten" className="lg:hidden" />
                    <p className="type-small text-ink-secondary md:type-body">
                        Kies hoe je iemand wilt leren kennen. Je blijft anoniem
                        tot je zelf iets deelt.
                    </p>
                    <ul className="grid gap-3.5 md:grid-cols-2 md:gap-6">
                        <li>
                            <MessagesCard unread={unread} />
                        </li>
                        {options.map((option) => (
                            <li key={option.title}>
                                <OptionCard option={option} />
                            </li>
                        ))}
                    </ul>
                </div>

                <aside
                    aria-label="Nu actief"
                    className="hidden w-[336px] shrink-0 flex-col gap-8 xl:flex"
                >
                    <OnlineWidget onlineCount={onlineCount} />
                    <RoomsWidget rooms={rooms} />
                </aside>
            </div>
        </>
    );
}
