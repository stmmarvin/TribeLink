import { Button, Spinner } from "@/components/tribelink/button";
import type { ChessEndReason, ChessGameState } from "@/types";

const REASONS: Record<ChessEndReason, string> = {
    checkmate: "Schaakmat",
    stalemate: "Pat: geen zetten meer, maar geen schaak",
    "insufficient-material": "Te weinig stukken om mat te zetten",
    "threefold-repetition": "Drie keer dezelfde stelling",
    "fifty-moves": "50 zetten zonder slag of pionzet",
    resign: "Opgegeven",
    left: "Partij verlaten",
    timeout: "Verbinding verbroken",
};

/** Result, reason and "Opnieuw spelen" / "Terug naar hotel" after a game. */
export function EndScreen({
    game,
    searching,
    onAgain,
    onHotel,
}: {
    game: ChessGameState;
    /** "Opnieuw spelen" was pressed: waiting for an opponent. */
    searching: { npcInSeconds: number } | null;
    onAgain: () => void;
    onHotel: () => void;
}) {
    const won = game.winner === game.myColor;
    const title =
        game.winner === null ? "Remise" : won ? "Gewonnen!" : "Verloren";
    const loser = game.winner === "white" ? game.black : game.white;
    const reason = game.endReason ? REASONS[game.endReason] : "";
    // Who resigned/left/disconnected: say it was the other side
    const detail =
        game.winner !== null &&
        ["resign", "left", "timeout"].includes(game.endReason ?? "")
            ? `${reason} door ${won ? (loser.isNpc ? loser.username : `@${loser.username}`) : "jou"}`
            : reason;

    return (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink/60 p-4">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="chess-result"
                className="w-full max-w-sm [animation:fade-in-soft_250ms_ease-out_both] overflow-hidden rounded-card border-4 border-ink bg-surface shadow-[6px_6px_0_0_rgb(15_30_58)]"
            >
                <header className="bg-brand px-4 py-2.5">
                    <h2 className="font-pixel text-[13px] tracking-wide text-white uppercase">
                        Partij afgelopen
                    </h2>
                </header>
                <div className="flex flex-col items-center gap-1 px-5 pt-5 pb-2 text-center">
                    <span aria-hidden className="text-[44px] leading-none">
                        {game.winner === null ? "🤝" : won ? "🏆" : "♟️"}
                    </span>
                    <p
                        id="chess-result"
                        className="mt-2 font-pixel text-[28px] leading-tight text-ink uppercase"
                    >
                        {title}
                    </p>
                    <p className="text-small text-ink-secondary">
                        {detail} · {game.result}
                    </p>
                </div>
                <div className="flex flex-col gap-2 p-5">
                    <Button
                        size="md"
                        fullWidth
                        onClick={onAgain}
                        disabled={searching !== null}
                        aria-busy={searching !== null}
                    >
                        {searching && <Spinner />}
                        {searching
                            ? searching.npcInSeconds > 0
                                ? `Zoeken… anders NPC over ${searching.npcInSeconds}s`
                                : "Partij klaarzetten…"
                            : "Opnieuw spelen"}
                    </Button>
                    <Button
                        variant="secondary"
                        size="md"
                        fullWidth
                        onClick={onHotel}
                    >
                        Terug naar hotel
                    </Button>
                </div>
            </section>
        </div>
    );
}
