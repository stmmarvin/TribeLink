import { Head, router, usePoll } from "@inertiajs/react";
import { Chess } from "chess.js";
import type { PieceSymbol, Square } from "chess.js";
import { useEffect, useRef, useState } from "react";
import { ChessBoard, colorName } from "@/components/chess/chess-board";
import { EndScreen } from "@/components/chess/end-screen";
import { PIECE_VALUE, PlayerCard } from "@/components/chess/player-card";
import { Countdown } from "@/components/games/countdown";
import { ConfirmGameExit, GameActions } from "@/components/games/game-actions";
import {
    GameTransition,
    markTransition,
    useTransitionReveal,
} from "@/components/games/transition";
import { useChessQueue } from "@/hooks/use-chess-queue";
import { PageHeader } from "@/layouts/app-layout";
import { cn } from "@/lib/utils";
import { npcMove } from "@/lib/chess/stockfish";
import { leave, move, resign, show } from "@/routes/schaken";
import type { ChessColor, ChessGameState } from "@/types";

/** How often the page asks the server for the opponent's move. */
const POLL_MS = 1000;

/** The NPC "thinks" at least this long (ms), so its moves don't feel instant. */
const NPC_DELAY_MIN = 500;
const NPC_DELAY_MAX = 1500;

const keep = { preserveScroll: true, preserveState: true, only: ["game"] };

const opposite = (c: ChessColor): ChessColor =>
    c === "white" ? "black" : "white";

/** The game rebuilt from its UCI moves, so chess.js knows the history too. */
function replay(moves: string[]): Chess {
    const chess = new Chess();

    for (const uci of moves) {
        try {
            chess.move({
                from: uci.slice(0, 2),
                to: uci.slice(2, 4),
                promotion: uci[4],
            });
        } catch {
            // Only a not-yet-checked own move can be illegal; the server answers soon
            break;
        }
    }

    return chess;
}

/**
 * Chess game from the Hotel (ChessController). The rules come from chess.js
 * here and from p-chess/chess on the server, which has the final say. The
 * page polls every second for the opponent's move; against the NPC this page
 * asks Stockfish for its moves and sends them like any other move.
 */
export default function ChessPage({ game }: { game: ChessGameState }) {
    // Your own move, shown right away while the server checks it
    const [pending, setPending] = useState<string | null>(null);
    const [moveError, setMoveError] = useState<string | null>(null);
    const [serverMoves, setServerMoves] = useState(game.moves.length);
    const [countdownDone, setCountdownDone] = useState(
        game.status !== "countdown",
    );
    const [confirmResign, setConfirmResign] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [reveal, revealDone] = useTransitionReveal();
    const moveListRef = useRef<HTMLOListElement>(null);

    if (serverMoves !== game.moves.length) {
        setServerMoves(game.moves.length);
        setPending(null);
    }

    const moves = pending ? [...game.moves, pending] : game.moves;
    const chess = replay(moves);
    const fen = chess.fen();
    const history = chess.history({ verbose: true });
    const last = history.at(-1);
    const finished = game.status === "finished";
    const playing = !finished && countdownDone;
    const turn = colorName(chess.turn());
    const npcColor = game.npcDifficulty ? opposite(game.myColor) : null;
    const opponentColor = opposite(game.myColor);

    const captured: Record<ChessColor, PieceSymbol[]> = {
        white: [],
        black: [],
    };

    for (const m of history) {
        if (m.captured) {
            captured[colorName(m.color)].push(m.captured);
        }
    }

    const material = (c: ChessColor) =>
        captured[c].reduce((sum, p) => sum + PIECE_VALUE[p], 0);
    const lead = material("white") - material("black");

    // Nieuwe zet: de zettenlijst scrollt mee naar beneden
    useEffect(() => {
        moveListRef.current?.scrollTo({
            top: moveListRef.current.scrollHeight,
        });
    }, [history.length]);

    const poll = usePoll(POLL_MS, { only: ["game"] }, { autoStart: false });

    useEffect(() => {
        if (finished) {
            poll.stop();
        } else {
            poll.start();
        }
    }, [finished]);

    const submit = (from: Square, to: Square, promotion?: PieceSymbol) => {
        setPending(from + to + (promotion ?? ""));
        setMoveError(null);
        router.post(
            move.url(game.id),
            { from, to, promotion: promotion ?? null },
            {
                ...keep,
                onError: (errors) => {
                    setPending(null);
                    setMoveError(errors.move ?? "Die zet mag niet.");
                },
            },
        );
    };

    // The NPC's turn: ask Stockfish, wait a natural moment, then play it
    const npcToMove =
        playing && npcColor === turn && pending === null && !chess.isGameOver();

    useEffect(() => {
        if (!npcToMove || !game.npcDifficulty) {
            return;
        }

        let cancelled = false;
        let timer = 0;
        const started = performance.now();
        const delay =
            NPC_DELAY_MIN + Math.random() * (NPC_DELAY_MAX - NPC_DELAY_MIN);

        void npcMove(fen, game.npcDifficulty).then((uci) => {
            timer = window.setTimeout(
                () => {
                    if (!cancelled) {
                        submit(
                            uci.slice(0, 2) as Square,
                            uci.slice(2, 4) as Square,
                            uci[4] as PieceSymbol | undefined,
                        );
                    }
                },
                Math.max(0, delay - (performance.now() - started)),
            );
        });

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [npcToMove, fen]);

    const backToHotel = () => {
        setConfirmLeave(false);
        setLeaving(true);
    };

    const rematch = useChessQueue((match) =>
        router.visit(show.url(match.gameId)),
    );

    const me = game[game.myColor];
    const opponent = game[opponentColor];
    const status = (() => {
        if (!countdownDone) return "De partij begint zo…";
        if (finished) return "Partij afgelopen";
        if (chess.isCheckmate()) return "Schaakmat!";
        if (chess.isDraw()) return "Remise";
        const check = chess.inCheck() ? "Schaak! " : "";
        if (turn === game.myColor) {
            return check
                ? "Schaak! Zet een geel omrand stuk"
                : "Jij bent aan zet";
        }
        if (opponent.isNpc) return `${check}${opponent.username} denkt na…`;
        return `${check}@${opponent.username} is aan zet`;
    })();

    const inCheck = chess.inCheck() && !finished;

    // Move list as pairs: 1. e4 e5
    const pairs: Array<[string, string | undefined]> = [];

    for (let i = 0; i < history.length; i += 2) {
        pairs.push([history[i].san, history[i + 1]?.san]);
    }

    return (
        <>
            <Head title="Schaken" />
            <PageHeader
                title="Schaken"
                actions={
                    <GameActions
                        playing={!finished}
                        onResign={() => setConfirmResign(true)}
                        onLeave={() =>
                            finished ? backToHotel() : setConfirmLeave(true)
                        }
                    />
                }
            />

            {/* Vaste wrapper: het speelvlak scrollt erin, de overlays liggen eroverheen (niet over de zijbalk) */}
            <div className="relative h-dvh overflow-hidden lg:h-[calc(100vh-72px)]">
                <div className="h-full overflow-y-auto bg-ink bg-[repeating-conic-gradient(rgb(255_255_255/0.035)_0_25%,transparent_0_50%)] bg-[length:48px_48px]">
                    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-3 lg:flex-row lg:items-start lg:justify-center lg:p-6">
                        <div className="mx-auto flex w-full max-w-[min(100%,calc(100dvh-182px))] flex-col gap-2 lg:mx-0 lg:max-w-[min(100%,calc(100vh-260px))]">
                            <PlayerCard
                                player={opponent}
                                color={opponentColor}
                                isMe={false}
                                toMove={playing && turn === opponentColor}
                                captured={captured[opponentColor]}
                                lead={opponentColor === "white" ? lead : -lead}
                            />
                            <ChessBoard
                                chess={chess}
                                orientation={game.myColor}
                                interactive={playing && pending === null}
                                lastMove={
                                    last && { from: last.from, to: last.to }
                                }
                                onMove={submit}
                            />
                            <PlayerCard
                                player={me}
                                color={game.myColor}
                                isMe
                                toMove={playing && turn === game.myColor}
                                captured={captured[game.myColor]}
                                lead={game.myColor === "white" ? lead : -lead}
                            />
                            {/* Mobiel: geen paginaheader, dus de knoppen hier */}
                            <div className="flex justify-end gap-2 lg:hidden">
                                <GameActions
                                    playing={!finished}
                                    onResign={() => setConfirmResign(true)}
                                    onLeave={() =>
                                        finished
                                            ? backToHotel()
                                            : setConfirmLeave(true)
                                    }
                                />
                            </div>
                        </div>

                        {/* Partijpaneel in de stijl van chess.com: status bovenaan, zettenlijst met laatste zet gemarkeerd */}
                        <aside className="flex w-full flex-col overflow-hidden rounded-card bg-surface text-ink shadow-[0_6px_0_0_rgb(0_0_0/0.25)] lg:w-72">
                            <header className="flex items-center gap-2 border-b border-line bg-subtle px-4 py-3">
                                <span
                                    aria-hidden
                                    className="text-[16px] leading-none"
                                >
                                    ♟
                                </span>
                                <h2 className="font-display text-[15px] font-bold text-ink">
                                    Zetten
                                </h2>
                            </header>
                            <p
                                role="status"
                                aria-live="polite"
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 font-display text-[14px] font-semibold",
                                    inCheck
                                        ? "bg-[#E84A3A]/10 text-[#B42318]"
                                        : "text-ink",
                                )}
                            >
                                <span
                                    aria-hidden
                                    className={cn(
                                        "size-2.5 shrink-0 rounded-full",
                                        inCheck
                                            ? "bg-[#E84A3A]"
                                            : playing && turn === game.myColor
                                              ? "bg-[#81B64C]"
                                              : "bg-ink-muted/50",
                                    )}
                                />
                                {status}
                            </p>
                            {moveError && (
                                <p
                                    role="alert"
                                    className="px-4 pb-2 text-caption text-[#B42318]"
                                >
                                    {moveError}
                                </p>
                            )}
                            <ol
                                ref={moveListRef}
                                className="max-h-60 overflow-y-auto border-t border-line py-1 font-display text-[14px] lg:max-h-[calc(100vh-360px)]"
                            >
                                {pairs.length === 0 && (
                                    <li className="px-4 py-3 text-[13px] text-ink-muted">
                                        Nog geen zetten. Wit begint.
                                    </li>
                                )}
                                {pairs.map(([w, b], i) => (
                                    <li
                                        key={i}
                                        className={cn(
                                            "grid grid-cols-[2.75rem_1fr_1fr] items-center px-2 py-0.5",
                                            i % 2 === 1 && "bg-subtle/60",
                                        )}
                                    >
                                        <span className="pl-2 text-ink-muted">
                                            {i + 1}.
                                        </span>
                                        {[w, b].map((san, side) => (
                                            <span
                                                key={side}
                                                className={cn(
                                                    "mr-2 rounded-[3px] px-2 py-1 font-bold",
                                                    i * 2 + side ===
                                                        history.length - 1
                                                        ? "bg-ink/10 text-ink"
                                                        : "text-ink-secondary",
                                                )}
                                            >
                                                {san ?? ""}
                                            </span>
                                        ))}
                                    </li>
                                ))}
                            </ol>
                        </aside>
                    </div>
                </div>

                {finished && (
                    <EndScreen
                        game={game}
                        searching={
                            rematch.state.status === "searching"
                                ? rematch.state
                                : null
                        }
                        onAgain={() =>
                            rematch.join(
                                game.roomId,
                                game.boardId,
                                game.npcDifficulty ?? "normal",
                            )
                        }
                        onHotel={backToHotel}
                    />
                )}
                {!countdownDone && (
                    <Countdown
                        label="De partij begint over"
                        startsAt={game.startsAt}
                        serverNow={game.serverNow}
                        onDone={() => setCountdownDone(true)}
                    />
                )}
                {reveal && (
                    <GameTransition
                        kind={reveal}
                        mode="reveal"
                        onDone={revealDone}
                    />
                )}
                {leaving && (
                    <GameTransition
                        kind="pixel"
                        mode="cover"
                        onDone={() => {
                            markTransition("pixel");
                            router.post(leave.url(game.id));
                        }}
                    />
                )}
            </div>

            <ConfirmGameExit
                open={confirmResign}
                onClose={() => setConfirmResign(false)}
                title="Partij opgeven?"
                description={`${opponent.isNpc ? opponent.username : `@${opponent.username}`} wint dan de partij.`}
                confirmLabel="Opgeven"
                onConfirm={() => {
                    setConfirmResign(false);
                    router.post(resign.url(game.id), {}, keep);
                }}
            />

            <ConfirmGameExit
                open={confirmLeave}
                onClose={() => setConfirmLeave(false)}
                title="Partij verlaten?"
                description="De partij loopt nog: als je nu weggaat geef je op en wint je tegenstander."
                confirmLabel="Opgeven en terug naar hotel"
                onConfirm={backToHotel}
            />
        </>
    );
}
