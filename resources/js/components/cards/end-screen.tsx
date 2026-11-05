import { AvatarPreview } from "@/components/hotel/AvatarPreview";
import { Button, Spinner } from "@/components/tribelink/button";
import { DEFAULT_LOOK } from "@/game/look";
import { cn } from "@/lib/utils";
import type { CardGameState, CardQueueState, CardSeat } from "@/types";

const OUT: Partial<Record<CardSeat["status"], string>> = {
    forfeited: "opgegeven",
    left: "weggegaan",
    "taken-over": "door NPC uitgespeeld",
};

/**
 * After the game: who won, the standing (cards left per player, fewest
 * first) and "Opnieuw" / "Terug naar kantine".
 */
export function CardEndScreen({
    game,
    again,
    onAgain,
    onStartNow,
    onHotel,
}: {
    game: CardGameState;
    /** "Opnieuw" was pressed: waiting at the table again. */
    again: Extract<CardQueueState, { status: "searching" }> | null;
    onAgain: () => void;
    onStartNow: () => void;
    onHotel: () => void;
}) {
    const winner = game.seats.find((s) => s.seat === game.winnerSeat);
    const won = winner?.isMe ?? false;
    const title = !winner
        ? "Potje gestopt"
        : won
          ? "Gewonnen!"
          : `${winner.isNpc ? winner.username : `@${winner.username}`} wint`;
    const standing = [...game.seats].sort(
        (a, b) =>
            Number(b.isWinner) - Number(a.isWinner) ||
            Number(a.status === "forfeited" || a.status === "left") -
                Number(b.status === "forfeited" || b.status === "left") ||
            (a.cardsLeft ?? a.cardCount) - (b.cardsLeft ?? b.cardCount),
    );

    return (
        <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-ink/60 p-4">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="cards-result"
                className="w-full max-w-sm [animation:fade-in-soft_250ms_ease-out_both] overflow-hidden rounded-card border-4 border-ink bg-surface shadow-[6px_6px_0_0_rgb(15_30_58)]"
            >
                <header className="bg-brand px-4 py-2.5">
                    <h2 className="font-pixel text-[13px] tracking-wide text-white uppercase">
                        Potje afgelopen
                    </h2>
                </header>
                <div className="flex flex-col items-center gap-1 px-5 pt-5 text-center">
                    <span aria-hidden className="text-[44px] leading-none">
                        {!winner ? "🃏" : won ? "🏆" : "🎴"}
                    </span>
                    <p
                        id="cards-result"
                        className="mt-2 font-pixel text-[26px] leading-tight text-ink uppercase"
                    >
                        {title}
                    </p>
                    <p className="text-small text-ink-secondary">
                        {game.endReason === "last-standing"
                            ? "Als laatste over aan tafel"
                            : game.endReason === "abandoned"
                              ? "Alle spelers zijn weg"
                              : `In ${game.turns} beurten`}
                        {" · "}
                        {game.wins} {game.wins === 1 ? "potje" : "potjes"}{" "}
                        gewonnen in totaal
                    </p>
                </div>

                <ol className="mx-5 mt-4 flex flex-col gap-1">
                    {standing.map((seat, place) => (
                        <li
                            key={seat.seat}
                            className={cn(
                                "flex items-center gap-2 rounded-input px-2 py-1.5",
                                seat.isWinner ? "bg-sunshine/25" : "bg-subtle",
                            )}
                        >
                            <span className="w-5 font-pixel text-[12px] text-ink-secondary">
                                {place + 1}.
                            </span>
                            <span className="flex size-8 shrink-0 items-start justify-center overflow-hidden rounded-tile bg-media-gradient">
                                <AvatarPreview
                                    look={seat.look ?? DEFAULT_LOOK}
                                    size={28}
                                />
                            </span>
                            <span className="min-w-0 flex-1 truncate font-jakarta text-label text-ink">
                                {seat.isNpc
                                    ? `🤖 ${seat.username}`
                                    : `@${seat.username}`}
                                {seat.isMe && (
                                    <span className="text-ink-muted">
                                        {" "}
                                        (jij)
                                    </span>
                                )}
                            </span>
                            <span className="shrink-0 font-pixel text-[11px] text-ink-secondary">
                                {OUT[seat.status] ??
                                    `${seat.cardsLeft ?? seat.cardCount} ${(seat.cardsLeft ?? seat.cardCount) === 1 ? "kaart" : "kaarten"}`}
                            </span>
                        </li>
                    ))}
                </ol>

                <div className="flex flex-col gap-2 p-5">
                    {again ? (
                        <>
                            <p
                                role="status"
                                className="text-center text-caption text-ink-secondary"
                            >
                                {again.full
                                    ? "De tafel is vol, je bent de volgende."
                                    : again.startsInSeconds === null
                                      ? `Wachten op spelers (${again.players.length}/4)…`
                                      : `Nieuw potje over ${again.startsInSeconds}s (${again.players.length}/4 aan tafel)`}
                            </p>
                            <Button size="md" fullWidth onClick={onStartNow}>
                                <Spinner />
                                Nu starten met NPC&apos;s
                            </Button>
                        </>
                    ) : (
                        <Button size="md" fullWidth onClick={onAgain}>
                            Opnieuw
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        size="md"
                        fullWidth
                        onClick={onHotel}
                    >
                        Terug naar kantine
                    </Button>
                </div>
            </section>
        </div>
    );
}
