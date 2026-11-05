import { Head, Link, usePage } from "@inertiajs/react";
import type { ReactNode } from "react";
import { NotShared } from "@/components/profile/not-shared";
import { PartnerContact } from "@/components/profile/partner-contact";
import { Avatar } from "@/components/tribelink/avatar";
import { MobileHeader } from "@/components/tribelink/back-link";
import { ButtonLink } from "@/components/tribelink/button";
import { Card } from "@/components/tribelink/card";
import { Chip } from "@/components/tribelink/chip";
import { PageHeader } from "@/layouts/app-layout";
import { statusLabels } from "@/lib/chat/format";
import {
    countShared,
    nothingShared,
    partnerFromUrl,
    partnerQuery,
    shareTotal,
} from "@/lib/sharing";
import type { PartnerProfilePageProps, ShareItemKey } from "@/types";

/** The id from /profile/{id}, used until the backend sends `partner`. */
function idFromPath(url: string) {
    return url.split("?")[0].split("/").filter(Boolean).pop() ?? "";
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Card className="flex flex-col gap-2 p-4">
            <h3 className="font-display text-xs leading-[18px] font-bold text-ink">
                {title}
            </h3>
            {children}
        </Card>
    );
}

// Figma 3.4 "Profiel – deels zichtbaar": someone else's profile, showing only
// the parts they share with you. Everything else is a dashed placeholder.
export default function PartnerProfilePage({
    partner: partnerProp,
    theirs = nothingShared,
    partnerProfile = null,
    partnerContact = null,
}: Partial<PartnerProfilePageProps>) {
    const { url } = usePage();
    const partner = partnerProp ?? partnerFromUrl(url, idFromPath(url));
    const handle = `@${partner.username}`;
    const isFriend = partner.status === "friend";

    // Friends share everything both ways (Figma 3.1 legend).
    const shares = (key: ShareItemKey) => isFriend || theirs[key];
    const sharedCount = isFriend ? shareTotal : countShared(theirs);
    const shareHref = `/profile/share?user=${partner.id}&${partnerQuery(partner)}`;

    const text = (key: ShareItemKey, label: string, value?: string | null) =>
        shares(key) ? (
            <p className="type-small text-ink-secondary">
                {value || "Nog niet ingevuld"}
            </p>
        ) : (
            <NotShared label={label} />
        );

    return (
        <>
            <Head title={`Profiel van ${handle}`} />
            <PageHeader title="Profiel" backHref={shareHref} />

            <div className="flex flex-1 flex-col gap-3.5 px-5 pt-1 pb-24 md:gap-6 md:px-10 md:py-8 lg:pb-8 xl:px-[72px]">
                <MobileHeader
                    title="Profiel"
                    backHref={shareHref}
                    className="md:hidden"
                />

                <div className="flex flex-col gap-3.5 md:gap-6 lg:flex-row lg:items-start">
                    {/* Sharing summary: on top on small screens, right column from lg */}
                    <aside className="w-full lg:order-2 lg:w-[280px] lg:shrink-0">
                        <Card className="flex flex-col gap-3 p-4">
                            <p
                                className="font-display text-xs leading-[18px] font-bold text-ink"
                                aria-live="polite"
                            >
                                {handle} deelt {sharedCount} van {shareTotal}{" "}
                                onderdelen met jou
                            </p>
                            <div
                                role="progressbar"
                                aria-label={`${handle} deelt met jou`}
                                aria-valuemin={0}
                                aria-valuemax={shareTotal}
                                aria-valuenow={sharedCount}
                                className="h-1.5 overflow-hidden rounded-full bg-subtle"
                            >
                                <div
                                    className="h-full rounded-full bg-brand"
                                    style={{
                                        width: `${(sharedCount / shareTotal) * 100}%`,
                                    }}
                                />
                            </div>
                            <ButtonLink
                                href={`/ontmoeten/berichten/start/${partner.id}`}
                                fullWidth
                            >
                                Bericht
                            </ButtonLink>
                            <ButtonLink
                                href={shareHref}
                                variant="secondary"
                                fullWidth
                            >
                                Mijn deling aanpassen
                            </ButtonLink>
                            <Link
                                href={shareHref}
                                className="self-start rounded-sm type-caption font-semibold text-ink underline underline-offset-2 focus-ring hover:text-brand-aa"
                            >
                                Alles wederzijds gedeeld →
                            </Link>
                        </Card>
                    </aside>

                    <div className="flex min-w-0 flex-1 flex-col gap-3.5 md:gap-6 lg:max-w-[584px]">
                        {/* Banner + avatar + name */}
                        <section aria-label="Profiel" className="flex flex-col">
                            {shares("banner") && partnerProfile?.bannerUrl ? (
                                <div className="h-[120px] overflow-hidden rounded-card md:h-[200px]">
                                    <img
                                        src={partnerProfile.bannerUrl}
                                        alt={`Banner van ${handle}`}
                                        className="size-full object-cover"
                                    />
                                </div>
                            ) : shares("banner") ? (
                                <div className="h-[120px] rounded-card bg-brand-gradient opacity-25 md:h-[200px]" />
                            ) : (
                                <NotShared
                                    label="Banner"
                                    className="h-[120px] items-center rounded-card md:h-[200px]"
                                />
                            )}

                            <div className="relative -mt-10 flex items-end gap-3 px-3 md:-mt-14 md:px-4">
                                <Avatar
                                    name={partner.username}
                                    src={
                                        shares("avatar")
                                            ? partner.avatarUrl
                                            : null
                                    }
                                    size={80}
                                    className="md:hidden"
                                />
                                <Avatar
                                    name={partner.username}
                                    src={
                                        shares("avatar")
                                            ? partner.avatarUrl
                                            : null
                                    }
                                    size={112}
                                    className="hidden md:inline-flex"
                                />
                                <div className="flex min-w-0 flex-col items-start gap-1 pb-1">
                                    <h1 className="truncate font-display text-xl leading-7 font-bold text-ink">
                                        {handle}
                                    </h1>
                                    <Chip variant={partner.status}>
                                        {statusLabels[partner.status]}
                                    </Chip>
                                </div>
                            </div>
                        </section>

                        {shares("real_name") ? (
                            <InfoCard title="Echte naam">
                                {text(
                                    "real_name",
                                    "Echte naam",
                                    partnerProfile?.realName,
                                )}
                            </InfoCard>
                        ) : (
                            <NotShared label="Echte naam" />
                        )}

                        <div className="grid gap-3.5 md:grid-cols-2 md:gap-4">
                            <InfoCard title="Bio">
                                {text("bio", "Bio", partnerProfile?.bio)}
                            </InfoCard>
                            <InfoCard title="Leuk weetje">
                                {text(
                                    "fun_fact",
                                    "Leuk weetje",
                                    partnerProfile?.funFact,
                                )}
                            </InfoCard>
                        </div>

                        <InfoCard title="Contactgegevens">
                            {shares("contact") && partnerContact ? (
                                <PartnerContact
                                    handle={handle}
                                    contact={partnerContact}
                                />
                            ) : shares("contact") ? (
                                <p className="type-small text-ink-secondary">
                                    Nog niet ingevuld
                                </p>
                            ) : (
                                <NotShared label="Contactgegevens" />
                            )}
                        </InfoCard>
                    </div>
                </div>
            </div>
        </>
    );
}
