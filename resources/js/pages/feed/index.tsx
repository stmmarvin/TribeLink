import { Head } from "@inertiajs/react";
import { useState } from "react";
import { PostCard } from "@/components/content/post-card";
import { ContactsWidget } from "@/components/content/widgets";
import { Card } from "@/components/tribelink/card";
import { EmptyState } from "@/components/tribelink/empty-state";
import { navIcons } from "@/components/tribelink/icons";
import { PlusIcon } from "@/components/tribelink/plus-icon";
import { SegmentedTabs } from "@/components/tribelink/tabs";
import { PageHeader } from "@/layouts/app-layout";
import { index as berichten } from "@/routes/chats";
import type { Contact, Post, Visibility } from "@/types";
import { PostComposer } from "@/components/content/post-composer";
import { Button, ButtonLink } from "@/components/tribelink/button";
import { icons } from "@/components/tribelink/icons";
import { Fab } from "@/components/tribelink/fab";

type Props = {
    posts?: Post[];
    contacts?: Contact[];
};

const tabs: { value: Visibility; label: string }[] = [
    { value: "public", label: "Publiek" },
    { value: "friends", label: "Vrienden" },
];

export default function FeedIndex({ posts = [], contacts = [] }: Props) {
    const [tab, setTab] = useState<Visibility>("public");

    const shown = posts.filter((post) => post.visibility === tab);

    // Rendered twice (desktop header / mobile), so each gets its own id prefix.
    const tabControl = (idPrefix: string, fullWidth: boolean) => (
        <SegmentedTabs<Visibility>
            idPrefix={idPrefix}
            panelIdPrefix="feed"
            label="Welke posts wil je zien?"
            value={tab}
            onChange={setTab}
            tabs={tabs}
            fullWidth={fullWidth}
        />
    );

    return (
        <>
            <Head title="Feed" />
            <PageHeader
                title="Feed"
                actions={
                    <div className="flex items-center gap-3">
                        {tabControl("feed", false)}
                        <ButtonLink
                            href="/feed/nieuw"
                            size="md"
                            className="w-11 px-0"
                            aria-label="Nieuwe post"
                        >
                            <PlusIcon />
                        </ButtonLink>
                    </div>
                }
            />

            <div className="flex flex-1 gap-6 px-5 pt-1 pb-8 md:px-10 md:py-8 xl:px-[72px] bg-app">
                <div className="flex min-w-0 flex-1 flex-col gap-3.5 md:gap-6">
                    {/* Mobile/tablet header (Figma 4.3 mobile) */}
                    <div className="pt-2 lg:hidden">
                        <h1 className="font-display text-2xl leading-7 font-bold text-ink">
                            Feed
                        </h1>
                    </div>

                    {/* Mobile: floating "+" bottom-right, above the tab bar */}
                    <Fab />

                    <div className="lg:hidden">
                        {tabControl("feed-m", true)}
                    </div>

                    <div
                        role="tabpanel"
                        id={`feed-panel-${tab}`}
                        aria-labelledby={`feed-tab-${tab} feed-m-tab-${tab}`}
                    >
                        {shown.length === 0 ? (
                            <Card className="md:max-w-[696px]">
                                <EmptyState
                                    icon={{
                                        src: navIcons.grid.default,
                                        size: 24,
                                    }}
                                    title="Er zijn nog geen berichten in je feed"
                                    text={
                                        tab === "friends"
                                            ? "Posts van je vrienden verschijnen hier."
                                            : "Zodra iemand iets deelt, zie je het hier."
                                    }
                                />
                            </Card>
                        ) : (
                            // Two columns on desktop, like Figma "Feed (2 kolommen)".
                            <ul className="gap-6 md:max-w-[696px] md:columns-2 md:[column-width:336px]">
                                {shown.map((post) => (
                                    <li
                                        key={post.id}
                                        className="mb-3.5 break-inside-avoid md:mb-6"
                                    >
                                        <PostCard post={post} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Right sidebar (desktop, Figma 4.3) */}
                <aside
                    aria-label="Overzicht"
                    className="hidden w-[336px] shrink-0 flex-col gap-8 xl:flex"
                >
                    <ContactsWidget contacts={contacts} href={berichten()} />
                </aside>
            </div>
        </>
    );
}
