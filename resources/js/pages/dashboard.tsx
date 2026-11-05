import { Head, Link, usePage } from "@inertiajs/react";
import { PostCard } from "@/components/content/post-card";
import {
    ContactsWidget,
    OnlineWidget,
    RoomsWidget,
    SectionHeader,
    onlineLabel,
} from "@/components/content/widgets";
import { Avatar } from "@/components/tribelink/avatar";
import { Card } from "@/components/tribelink/card";
import { Chip } from "@/components/tribelink/chip";
import { EmptyState } from "@/components/tribelink/empty-state";
import { Fab } from "@/components/tribelink/fab";
import { navIcons } from "@/components/tribelink/icons";
import { PageHeader } from "@/layouts/app-layout";
import { greeting } from "@/lib/format";
import { cn } from "@/lib/utils";
import { feed, ontmoeten } from "@/routes";
import { show as showProfile } from "@/routes/profile";
import { index as berichten } from "@/routes/chats";
import type { Contact, Post, Room } from "@/types";

type Props = {
    posts?: Post[];
    contacts?: Contact[];
    rooms?: Room[];
    /** People available for random chat; null = unknown ("–"). */
    onlineCount?: number | null;
};

const twoColumns =
    "grid gap-3.5 md:grid-cols-[repeat(2,minmax(0,336px))] md:gap-6";

/** Figma "Ontmoet iemand" card. */
function MeetCard({
    onlineCount,
    roomCount,
}: {
    onlineCount: number | null;
    roomCount: number;
}) {
    const chipClasses =
        "font-body font-normal text-ink md:font-display md:font-semibold md:text-ink-secondary";

    return (
        <Link
            href={ontmoeten()}
            className="group block rounded-card focus-ring"
        >
            <Card
                interactive
                className="flex items-center gap-5 p-[15px] md:border-[1.5px] md:p-6"
            >
                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="font-display text-2xl leading-7 font-bold text-ink md:type-h3">
                            Ontmoet iemand
                        </h2>
                        <span
                            aria-hidden="true"
                            className="text-base text-ink-secondary md:hidden"
                        >
                            ›
                        </span>
                    </div>
                    <p className="type-small text-ink-secondary">
                        Random chat, Hotel of poster
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Chip variant="neutral" className={chipClasses}>
                            {onlineLabel(onlineCount)}
                        </Chip>
                        <Chip variant="neutral" className={chipClasses}>
                            Lobby · {roomCount} ruimtes
                        </Chip>
                    </div>
                </div>
                <span
                    aria-hidden="true"
                    className="hidden type-h3 text-ink md:block"
                >
                    ›
                </span>
            </Card>
        </Link>
    );
}

export default function Dashboard({
    posts = [],
    contacts = [],
    rooms = [],
    onlineCount = null,
}: Props) {
    const { auth } = usePage().props;
    const firstName = auth.user.name.trim().split(/\s+/)[0];
    const hello = greeting();

    return (
        <>
            <Head title="Home" />
            <PageHeader
                eyebrow={<span suppressHydrationWarning>{hello}</span>}
                title={`Hoi, ${firstName}`}
                actions={
                    <Link
                        href={showProfile()}
                        className="rounded-full focus-ring"
                        aria-label="Naar je profiel"
                    >
                        <Avatar
                            name={auth.user.name}
                            src={auth.user.avatar}
                            size={40}
                        />
                    </Link>
                }
            />

            <div className="flex flex-1 gap-6 px-5 pt-1 pb-24 md:px-10 md:py-8 lg:pb-8 xl:px-[72px]">
                <div className="flex min-w-0 flex-1 flex-col gap-3.5 md:gap-6">
                    {/* Mobile/tablet header (Figma 2.1 mobile) */}
                    <div className="flex items-center justify-between gap-4 pt-2 lg:hidden">
                        <div>
                            <p
                                className="type-caption text-ink-secondary"
                                suppressHydrationWarning
                            >
                                {hello}
                            </p>
                            <h1 className="font-display text-2xl leading-7 font-bold text-ink">
                                Hoi, {firstName}
                            </h1>
                        </div>
                        <Link
                            href={showProfile()}
                            className="rounded-full focus-ring"
                            aria-label="Naar je profiel"
                        >
                            <Avatar
                                name={auth.user.name}
                                src={auth.user.avatar}
                                size={36}
                            />
                        </Link>
                    </div>

                    <MeetCard
                        onlineCount={onlineCount}
                        roomCount={rooms.length}
                    />

                    <section className="flex flex-col gap-3.5 md:gap-6">
                        <SectionHeader
                            title="Recent in de feed"
                            linkLabel="Alles bekijken"
                            href={feed()}
                        />
                        {posts.length === 0 ? (
                            <Card>
                                <EmptyState
                                    icon={{
                                        src: navIcons.grid.default,
                                        size: 24,
                                    }}
                                    title="Nog geen posts"
                                    text="Er zijn nog geen posts in je feed."
                                    className="py-6"
                                />
                            </Card>
                        ) : (
                            <div className={twoColumns}>
                                {posts.slice(0, 2).map((post) => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
                                        variant="preview"
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {/* Right sidebar (desktop, Figma 2.1) */}
                <aside
                    aria-label="Overzicht"
                    className={cn(
                        "hidden w-[336px] shrink-0 flex-col gap-8 xl:flex",
                    )}
                >
                    <OnlineWidget onlineCount={onlineCount} />
                    <ContactsWidget
                        contacts={contacts}
                        href={berichten()}
                        contactHref={(contact) =>
                            `/profile/${contact.id}/poster`
                        }
                    />
                    <RoomsWidget rooms={rooms} />
                </aside>
            </div>

            <Fab />
        </>
    );
}
