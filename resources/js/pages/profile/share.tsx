import { Head, router, usePage } from "@inertiajs/react";
import { useState } from "react";
import { ShareProgress } from "@/components/profile/share-progress";
import { Avatar } from "@/components/tribelink/avatar";
import { MobileHeader } from "@/components/tribelink/back-link";
import { Button, ButtonLink } from "@/components/tribelink/button";
import { Card } from "@/components/tribelink/card";
import { Chip } from "@/components/tribelink/chip";
import { icons } from "@/components/tribelink/icons";
import { Modal } from "@/components/tribelink/modal";
import { Switch } from "@/components/tribelink/switch";
import { PageHeader } from "@/layouts/app-layout";
import { statusLabels } from "@/lib/chat/format";
import {
    countShared,
    nothingShared,
    partnerFromUrl,
    partnerQuery,
    shareItems as items,
    shareTotal as total,
} from "@/lib/sharing";
import { cn } from "@/lib/utils";
import { show as profile } from "@/routes/profile";
import type {
    ContactStatus,
    ProfileShareProps,
    ShareItemKey,
    ShareSettings,
} from "@/types";

/** Everything except contact details is shared. */
const restShared = (settings: ShareSettings) =>
    items.every(({ key }) => key === "contact" || settings[key]);

type Props = Partial<ProfileShareProps> & {
    /** PATCH endpoint for the share settings. Saving is skipped without it. */
    saveUrl?: string;
};

export default function ProfileShare({
    partner: partnerProp,
    mine: initialMine = nothingShared,
    theirs = nothingShared,
    saveUrl,
}: Props) {
    const { url } = usePage();
    const partner = partnerProp ?? partnerFromUrl(url);

    const [mine, setMine] = useState<ShareSettings>(initialMine);
    const [consentOpen, setConsentOpen] = useState(false);

    const mineCount = countShared(mine);
    const theirsCount = countShared(theirs);
    const canShareContact = restShared(mine);
    const status: ContactStatus =
        partner.status === "friend" ||
        (mineCount === total && theirsCount === total)
            ? "friend"
            : partner.status;
    const isFriend = status === "friend";

    function save(next: ShareSettings) {
        setMine(next);

        if (saveUrl) {
            router.patch(saveUrl, next, {
                preserveScroll: true,
                preserveState: true,
            });
        }
    }

    function toggle(key: ShareItemKey, checked: boolean) {
        // Contact details need explicit consent first (AVG).
        if (key === "contact" && checked) {
            setConsentOpen(true);

            return;
        }

        const next = { ...mine, [key]: checked };

        // Hiding any other part also stops sharing contact details.
        if (!checked && key !== "contact") {
            next.contact = false;
        }

        save(next);
    }

    const handle = `@${partner.username}`;

    return (
        <>
            <Head title="Profiel delen" />
            <PageHeader title="Profiel delen" backHref={profile()} />

            <div className="flex flex-1 flex-col gap-3.5 px-5 pt-1 pb-24 md:gap-6 md:px-10 md:py-8 lg:pb-8 xl:px-[72px]">
                <MobileHeader
                    title="Profiel delen"
                    backHref={profile()}
                    className="md:hidden"
                />
                <div className="flex flex-col gap-3.5 md:gap-6 lg:flex-row lg:items-start">
                    {/* Partner preview: on top on small screens, right column from lg */}
                    <aside className="w-full lg:order-2 lg:w-[280px] lg:shrink-0">
                        <PartnerCard
                            partner={partner}
                            status={status}
                            sharedCount={theirsCount}
                            showAvatar={theirs.avatar || isFriend}
                            isFriend={isFriend}
                        />
                    </aside>

                    <div className="flex min-w-0 flex-1 flex-col gap-3.5 md:gap-6 lg:max-w-[584px]">
                        <p className="rounded-field bg-media-tint px-3 py-2.5 type-caption text-ink-secondary">
                            Jullie hebben elkaar ontmoet! Kies wat je met{" "}
                            {handle} deelt.
                        </p>

                        <ShareProgress
                            mine={mineCount}
                            theirs={theirsCount}
                            total={total}
                        />

                        <Card className="px-4">
                            <ul className="divide-y divide-line">
                                {items.map(({ key, label }) => {
                                    const id = `share-${key}`;
                                    const isContact = key === "contact";
                                    const locked =
                                        isContact && !canShareContact;

                                    return (
                                        <li
                                            key={key}
                                            className="flex flex-col gap-1 py-3"
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                <span
                                                    id={id}
                                                    className={cn(
                                                        "type-small text-ink",
                                                        locked &&
                                                            "text-ink-muted",
                                                    )}
                                                >
                                                    {label}
                                                </span>
                                                <Switch
                                                    aria-labelledby={id}
                                                    aria-describedby={
                                                        isContact
                                                            ? `${id}-hint`
                                                            : undefined
                                                    }
                                                    checked={mine[key]}
                                                    disabled={locked}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) => toggle(key, checked)}
                                                />
                                            </div>
                                            {isContact && (
                                                <p
                                                    id={`${id}-hint`}
                                                    className="flex items-center gap-1.5 type-caption text-ink-muted"
                                                >
                                                    <img
                                                        src={icons.lockMuted}
                                                        alt=""
                                                        width={8}
                                                        height={8}
                                                    />
                                                    {locked
                                                        ? "Deel eerst de rest van je profiel."
                                                        : `Alleen zichtbaar voor ${handle}. Je kunt dit altijd weer uitzetten.`}
                                                </p>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </Card>

                        <p className="type-caption text-ink-muted">
                            Delen jullie allebei 6 van 6? Dan worden jullie
                            officieel vrienden.
                        </p>
                    </div>
                </div>
            </div>

            <Modal
                open={consentOpen}
                onClose={() => setConsentOpen(false)}
                title="Contactgegevens delen?"
                description={
                    <ul className="flex list-disc flex-col gap-1.5 pl-5">
                        <li>
                            Alleen <strong>{handle}</strong> ziet je
                            contactgegevens. Ze zijn niet openbaar.
                        </li>
                        <li>
                            {handle} mag ze niet zonder jouw toestemming met
                            anderen delen.
                        </li>
                        <li>
                            Je kunt dit altijd weer uitzetten. Dan ziet {handle}{" "}
                            ze niet meer.
                        </li>
                    </ul>
                }
            >
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                        variant="ghost"
                        size="md"
                        onClick={() => setConsentOpen(false)}
                    >
                        Annuleren
                    </Button>
                    <Button
                        size="md"
                        onClick={() => {
                            setConsentOpen(false);
                            save({ ...mine, contact: true });
                        }}
                    >
                        Ik geef toestemming
                    </Button>
                </div>
            </Modal>
        </>
    );
}

function PartnerCard({
    partner,
    status,
    sharedCount,
    showAvatar,
    isFriend,
}: {
    partner: ProfileShareProps["partner"];
    status: ContactStatus;
    sharedCount: number;
    showAvatar: boolean;
    isFriend: boolean;
}) {
    const handle = `@${partner.username}`;

    return (
        <Card className="flex flex-col items-center gap-2 p-4 text-center">
            <Avatar
                name={partner.username}
                src={showAvatar ? partner.avatarUrl : null}
                size={60}
            />
            <p className="font-display text-sm font-bold text-ink">{handle}</p>
            <Chip variant={status}>{statusLabels[status]}</Chip>
            <p className="type-caption text-ink-secondary">
                {isFriend
                    ? "Deelt alles met jou"
                    : `Deelt ${sharedCount} van ${total} onderdelen met jou`}
            </p>
            <ButtonLink
                href={`/profile/${partner.id}?${partnerQuery(partner)}`}
                fullWidth
                className="mt-1"
            >
                Bekijk profiel van {handle}
            </ButtonLink>
        </Card>
    );
}
