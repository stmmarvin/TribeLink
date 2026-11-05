import { Head, Link, usePage } from "@inertiajs/react";
import { PostCard } from "@/components/content/post-card";
import { ContactsWidget } from "@/components/content/widgets";
import { Avatar } from "@/components/tribelink/avatar";
import { buttonClasses, ButtonLink } from "@/components/tribelink/button";
import { Card } from "@/components/tribelink/card";
import { EmptyState } from "@/components/tribelink/empty-state";
import { Fab } from "@/components/tribelink/fab";
import { icons, navIcons } from "@/components/tribelink/icons";
import { ThemeToggle } from "@/components/tribelink/app-nav";
import { PageHeader } from "@/layouts/app-layout";
import { cn } from "@/lib/utils";
import { usernameFor } from "@/lib/user";
import { index as berichten } from "@/routes/chats";
import { edit } from "@/routes/profile";
import type { Contact, Post } from "@/types";

type Tab = "posts" | "events";

type Props = {
    bio?: string | null;
    bannerUrl?: string | null;
    posts?: Post[];
    contacts?: Contact[];
};

export default function ProfileShow({
    bio = null,
    bannerUrl = null,
    posts = [],
    contacts = [],
}: Props) {
    const { auth } = usePage().props;
    const username = usernameFor(auth.user);

    const friends = contacts.filter((contact) => contact.status === "friend");

    return (
        <>
            <div className="lg:hidden">
                <ThemeToggle />
            </div>
            <Head title="Mijn profiel" />
            <PageHeader title="Mijn profiel" />

            <div className="flex flex-1 gap-6 px-5 pt-1 pb-24 md:px-10 md:py-8 lg:pb-8 xl:px-[72px]">
                <div className="flex min-w-0 flex-1 flex-col gap-3.5 md:gap-6">
                    <h1 className="sr-only lg:hidden">Mijn profiel</h1>

                    {/* Profiel header */}
                    <section aria-label="Profiel" className="flex flex-col">
                        <div className="relative mt-1 md:mt-0">
                            <div
                                className="h-[120px] overflow-hidden rounded-card bg-media-tint md:h-[200px]"
                                aria-hidden={!bannerUrl}
                            >
                                {bannerUrl ? (
                                    <img
                                        src={bannerUrl}
                                        alt="Profielbanner"
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <div className="size-full bg-brand-gradient opacity-25" />
                                )}
                            </div>
                            <Avatar
                                name={username}
                                src={auth.user.avatar}
                                size={80}
                                className="absolute -bottom-10 left-4 md:hidden"
                            />
                        </div>

                        <div className="relative mt-[72px] flex items-center justify-between gap-4 md:mt-[-56px] md:items-end md:gap-5 md:px-6">
                            <Avatar
                                name={username}
                                src={auth.user.avatar}
                                size={112}
                                className="hidden md:inline-flex"
                            />
                            <div className="flex min-w-0 flex-col md:flex-1 md:pb-3">
                                <h2 className="truncate font-display text-2xl leading-7 font-bold text-ink md:type-h2">
                                    @{username}
                                </h2>
                                <p className="flex items-center gap-1 type-caption text-ink-secondary md:hidden">
                                    <img
                                        src={icons.lock}
                                        alt=""
                                        width={12}
                                        height={12}
                                    />
                                    Echte naam alleen zichtbaar voor vrienden
                                </p>
                            </div>
                            <ButtonLink
                                href={edit()}
                                variant="secondary"
                                size="sm"
                                className="h-[38px] px-3.5 md:hidden"
                            >
                                Bewerken
                            </ButtonLink>
                            <ButtonLink
                                href={edit()}
                                variant="secondary"
                                size="md"
                                className="hidden w-[120px] md:inline-flex"
                            >
                                Bewerken
                            </ButtonLink>
                        </div>
                    </section>

                    <p className="hidden items-center gap-2 type-caption leading-[18px] text-ink-muted md:flex">
                        <img
                            src={icons.lockMuted}
                            alt=""
                            width={7}
                            height={7}
                        />
                        Echte naam alleen zichtbaar voor vrienden
                    </p>

                    {bio && (
                        <p className="type-small text-ink-secondary">{bio}</p>
                    )}

                    {/* Bewaard / Vrienden */}
                    <div className="flex gap-2">
                        {[
                            `Bewaard (${contacts.length})`,
                            `Vrienden (${friends.length})`,
                        ].map((label) => (
                            <Link
                                key={label}
                                href={berichten()}
                                className={cn(
                                    buttonClasses({
                                        variant: "secondary",
                                        size: "sm",
                                    }),
                                    "h-[38px] flex-1 md:h-auto md:flex-none md:rounded-full md:border-0 md:bg-subtle md:px-2.5 md:py-[3px] md:text-xs md:leading-[18px] md:text-ink-secondary md:hover:bg-brand/10 md:hover:text-ink",
                                )}
                            >
                                {label}
                            </Link>
                        ))}
                    </div>

                    <h2 className="type-h3 text-ink">Posts</h2>

                    <div className="grid gap-3.5 md:grid-cols-[repeat(2,minmax(0,336px))] md:gap-6">
                        {posts.length === 0 ? (
                            <Card className="col-span-full md:max-w-[696px]">
                                <EmptyState
                                    icon={{
                                        src: navIcons.grid.default,
                                        size: 24,
                                    }}
                                    title="Nog geen posts"
                                    text="Je posts verschijnen hier zodra je iets deelt."
                                />
                            </Card>
                        ) : (
                            posts.map((post) => (
                                <PostCard key={post.id} post={post} />
                            ))
                        )}
                    </div>
                </div>

                {/* Right sidebar (desktop) */}
                <aside className="hidden w-[336px] shrink-0 flex-col gap-8 xl:flex">
                    <ContactsWidget contacts={contacts} href={berichten()} />
                    <ContactsWidget
                        title={`Vrienden (${friends.length})`}
                        contacts={friends}
                        href={berichten()}
                        contactHref={(contact) =>
                            `/profile/${contact.id}/poster`
                        }
                        emptyText="Je hebt nog geen vrienden."
                        limit={5}
                        showSubtitle={false}
                    />
                </aside>
            </div>

            <Fab />
        </>
    );
}
