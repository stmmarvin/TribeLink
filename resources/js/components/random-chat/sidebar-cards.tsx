import { Link } from "@inertiajs/react";
import { Avatar } from "@/components/tribelink/avatar";
import { Button } from "@/components/tribelink/button";
import { Card } from "@/components/tribelink/card";
import { Chip } from "@/components/tribelink/chip";
import { RoomRow, WidgetCard } from "@/components/content/widgets";
import { ONLINE_ROOMS } from "@/game/rooms";
import { statusLabels } from "@/lib/chat/format";
import { cn } from "@/lib/utils";
import { lobby } from "@/routes/ontmoeten";
import type { ContactStatus, RandomChatPartner, Room } from "@/types";
import { SaveButton } from "./chat-actions";

const steps = [
    "Je wordt gekoppeld aan iemand die nu online is",
    "Je ziet alleen elkaars gebruikersnaam",
    "Klik op Bewaren om contact te houden",
];

/** Numbered steps of "Hoe werkt random chat?" (Figma 2.3 desktop). */
export function HowItWorksSteps({ className }: { className?: string }) {
    return (
        <ol className={cn("flex flex-col gap-2.5", className)}>
            {steps.map((step, index) => (
                <li key={step} className="flex items-start gap-2.5 text-left">
                    <span
                        aria-hidden="true"
                        className="flex size-5 shrink-0 items-center justify-center rounded-full border border-brand font-display text-xs leading-[18px] font-semibold text-ink"
                    >
                        {index + 1}
                    </span>
                    <span className="type-caption leading-[18px] text-ink-secondary">
                        {step}
                    </span>
                </li>
            ))}
        </ol>
    );
}

export function HowItWorksCard() {
    return (
        <WidgetCard title="Hoe werkt random chat?">
            <HowItWorksSteps />
        </WidgetCard>
    );
}

// Occupancy is unknown until the lobby backend reports it.
const lobbyRooms: Room[] = ONLINE_ROOMS.map((room) => ({
    id: room.id,
    name: room.name,
    peopleCount: null,
}));

/** "Of probeer de lobby" (Figma 2.3 desktop): rooms link to the Hotel. */
export function LobbyRoomsCard() {
    return (
        <WidgetCard title="Of probeer de lobby">
            <ul className="flex flex-col divide-y divide-line">
                {lobbyRooms.map((room) => (
                    <li key={room.id} className="py-2.5 first:pt-0 last:pb-0">
                        <Link
                            href={lobby({ query: { kamer: room.id } })}
                            className="-mx-1.5 block rounded-field px-1.5 py-0.5 transition-colors hover:bg-subtle focus-ring"
                        >
                            <RoomRow room={room} />
                        </Link>
                    </li>
                ))}
            </ul>
        </WidgetCard>
    );
}

/** "Over dit gesprek" (Figma 2.4 desktop, right column). */
export function PartnerCard({
    partner,
    saved,
    onSave,
    onSkip,
    onLeave,
    disabled = false,
}: {
    partner: RandomChatPartner;
    saved: boolean;
    onSave: () => Promise<void>;
    onSkip: () => void;
    onLeave: () => void;
    disabled?: boolean;
}) {
    return (
        <Card className="flex flex-col items-center gap-3 p-4 text-center">
            <Avatar name={partner.username} size={72} />
            <p className="font-display text-base leading-[21px] font-bold text-ink">
                @{partner.username}
            </p>
            <p className="type-caption leading-[18px] text-ink-muted">
                Anoniem · alleen gebruikersnaam zichtbaar
            </p>
            <SaveButton
                saved={saved}
                onSave={onSave}
                disabled={disabled}
                fullWidth
            />
            <Button
                variant="secondary"
                fullWidth
                onClick={onSkip}
                disabled={disabled}
            >
                Volgende chat
            </Button>
            <Button
                variant="ghost"
                fullWidth
                onClick={onLeave}
                disabled={disabled}
            >
                Chat verlaten
            </Button>
        </Card>
    );
}

const friendSteps: Array<{ status: ContactStatus; text: string }> = [
    { status: "saved", text: "nog niet in het echt ontmoet" },
    { status: "partial", text: "ontmoet, profiel deels gedeeld" },
    { status: "friend", text: "alles wederzijds gedeeld" },
];

/** "Stap voor stap vrienden" (Figma 2.4 desktop). */
export function FriendStepsCard() {
    return (
        <WidgetCard title="Stap voor stap vrienden">
            <ul className="flex flex-col gap-2.5">
                {friendSteps.map(({ status, text }) => (
                    <li key={status} className="flex items-center gap-2.5">
                        <Chip variant={status}>{statusLabels[status]}</Chip>
                        <span className="type-caption leading-[18px] text-ink-secondary">
                            {text}
                        </span>
                    </li>
                ))}
            </ul>
        </WidgetCard>
    );
}
