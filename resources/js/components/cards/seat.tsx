import { AvatarPreview } from "@/components/hotel/AvatarPreview";
import { DEFAULT_LOOK } from "@/game/look";
import { cn } from "@/lib/utils";
import type { CardSeat } from "@/types";
import { PixelCard } from "./pixel-card";
import type { SeatSide } from "./table-layout";

const STATUS_LABELS: Partial<Record<CardSeat["status"], string>> = {
    "taken-over": "NPC speelt verder",
    forfeited: "Opgegeven",
    left: "Weggegaan",
};

/** A short message above a player: "LAATSTE!", "Beurt over", … */
export type SeatBubble = {
    id: number;
    text: string;
    tone: "info" | "alert";
};

/**
 * A player at the table: their Hotel avatar, name and the backs of their
 * cards (only the number is known). The player whose turn it is glows and
 * shows the turn timer.
 */
export function TableSeat({
    seat,
    side,
    active,
    timerPercent,
    bubble,
    shake,
}: {
    seat: CardSeat;
    side: SeatSide;
    active: boolean;
    /** Time left of the turn (100 → 0), on the active player only. */
    timerPercent: number | null;
    bubble: SeatBubble | null;
    /** Skipped or caught: the seat shakes once. */
    shake: number | null;
}) {
    const out = seat.status === "forfeited" || seat.status === "left";
    const backs = Math.min(seat.cardCount, 10);

    return (
        <div
            key={shake ?? undefined}
            className={cn(
                "pointer-events-none relative flex w-24 flex-col items-center gap-1 sm:w-28",
                shake !== null && "animate-card-shake",
                out && "opacity-45",
            )}
            aria-label={`${seat.isMe ? "Jij" : seat.username}: ${seat.cardCount} ${seat.cardCount === 1 ? "kaart" : "kaarten"}${active ? ", aan de beurt" : ""}`}
        >
            {bubble && (
                <span
                    key={bubble.id}
                    className={cn(
                        "absolute -top-7 z-10 animate-perfect-pop rounded-input border-2 border-ink px-2 py-0.5 font-pixel text-[11px] whitespace-nowrap uppercase shadow-[2px_2px_0_0_rgb(15_30_58)]",
                        bubble.tone === "info" && "bg-sunshine text-ink",
                        bubble.tone === "alert" && "bg-[#E84A3A] text-white",
                    )}
                    style={{ animationDuration: "1600ms" }}
                >
                    {bubble.text}
                </span>
            )}
            <div
                className={cn(
                    "relative flex size-14 items-start justify-center overflow-hidden rounded-tile border-2 bg-media-gradient sm:size-16",
                    active
                        ? "animate-turn-glow border-sunshine"
                        : "border-ink/60",
                )}
            >
                <AvatarPreview
                    look={seat.look ?? DEFAULT_LOOK}
                    size={side === "bottom" ? 48 : 52}
                    dir={side === "left" ? 2 : side === "right" ? 4 : 2}
                    className="shrink-0"
                />
            </div>
            <span className="max-w-full truncate rounded-pill bg-ink/80 px-2 py-0.5 font-jakarta text-[12px] text-white">
                {seat.isNpc ? `🤖 ${seat.username}` : `@${seat.username}`}
                {seat.isMe && " (jij)"}
            </span>
            {timerPercent !== null && (
                <span
                    aria-hidden
                    className="h-1.5 w-full overflow-hidden rounded-pill bg-ink/50"
                >
                    <span
                        className={cn(
                            "block h-full transition-[width] duration-200 ease-linear",
                            timerPercent > 30 ? "bg-sunshine" : "bg-[#E84A3A]",
                        )}
                        style={{ width: `${timerPercent}%` }}
                    />
                </span>
            )}
            {STATUS_LABELS[seat.status] ? (
                <span className="font-pixel text-[10px] text-white/80 uppercase">
                    {STATUS_LABELS[seat.status]}
                </span>
            ) : (
                !seat.isMe && (
                    <span className="flex items-center gap-1">
                        <span className="flex">
                            {Array.from({ length: backs }, (_, i) => (
                                <PixelCard
                                    key={i}
                                    card={null}
                                    className={cn("w-4", i > 0 && "-ml-2.5")}
                                />
                            ))}
                        </span>
                        <span
                            className={cn(
                                "font-pixel text-[13px] text-white",
                                seat.cardCount === 1 && "text-sunshine",
                            )}
                        >
                            {seat.cardCount}
                        </span>
                    </span>
                )
            )}
        </div>
    );
}
