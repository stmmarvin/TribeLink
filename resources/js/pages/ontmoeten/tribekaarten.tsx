import { Head, router, usePoll } from "@inertiajs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { DealIntro } from "@/components/cards/deal-intro";
import { CardEndScreen } from "@/components/cards/end-screen";
import { Hand } from "@/components/cards/hand";
import { ColorPicker, SwapPicker } from "@/components/cards/pickers";
import { PixelCard } from "@/components/cards/pixel-card";
import { TableSeat } from "@/components/cards/seat";
import type { SeatBubble } from "@/components/cards/seat";
import {
    ANCHORS,
    SEAT_CLASSES,
    seatSide,
} from "@/components/cards/table-layout";
import type { SeatSide } from "@/components/cards/table-layout";
import { Countdown } from "@/components/games/countdown";
import { ConfirmGameExit, GameActions } from "@/components/games/game-actions";
import { prefersReducedMotion } from "@/components/games/pixel-transition";
import {
    GameTransition,
    markTransition,
    useTransitionReveal,
} from "@/components/games/transition";
import { Button } from "@/components/tribelink/button";
import { useGameQueue } from "@/hooks/use-game-queue";
import { PageHeader } from "@/layouts/app-layout";
import {
    CARD_COLORS,
    COLOR_ORDER,
    cardColor,
    cardValue,
    isWild,
    sortHand,
    spritePath,
} from "@/lib/cards";
import { cn } from "@/lib/utils";
import * as tribekaarten from "@/routes/tribekaarten";
import type {
    CardCode,
    CardColor,
    CardEvent,
    CardGameState,
    CardQueueState,
} from "@/types";

/** How often the page asks the server what happened at the table. */
const POLL_MS = 800;

/** How long a bubble, banner or shake stays (ms). */
const EFFECT_MS = 1700;

const keep = { preserveScroll: true, preserveState: true, only: ["game"] };

/** A card flying over the table (drawing): from the pile to a seat. */
type Flight = { id: string; to: SeatSide; delay: number };

const SHAPES: Record<CardColor, string[]> = {
    sun: [".###.", "#####", "#####", "#####", ".###."],
    sea: [".##..", "#..##", ".....", ".##..", "#..##"],
    leaf: ["..#..", ".###.", ".###.", "#####", "..#.."],
    fire: ["..#..", ".###.", "#####", ".###.", "..#.."],
};

const name = (seat: { isNpc: boolean; username: string; isMe: boolean }) =>
    seat.isMe ? "Jij" : seat.isNpc ? seat.username : `@${seat.username}`;

/**
 * A game of Tribekaarten (CardGameController). The table is seen from
 * above with everybody's Hotel avatar around it and your hand at the
 * bottom. The server runs the game; this page polls it and turns what
 * happened (the events) into animations.
 */
export default function CardsPage({ game }: { game: CardGameState }) {
    const [reveal, revealDone] = useTransitionReveal();
    const [reduced] = useState(prefersReducedMotion);
    const [countdownDone, setCountdownDone] = useState(
        game.status !== "countdown",
    );
    // Zoom in, shuffle and deal: only when you arrive before the first turn
    const [intro, setIntro] = useState<"waiting" | "running" | "done">(
        game.status === "countdown" || game.status === "dealing"
            ? "waiting"
            : "done",
    );
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [picking, setPicking] = useState<{
        card: CardCode;
        step: "color" | "swap";
        color?: CardColor;
    } | null>(null);
    const [confirmResign, setConfirmResign] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [bubbles, setBubbles] = useState<Record<number, SeatBubble>>({});
    const [shakes, setShakes] = useState<Record<number, number>>({});
    const [flights, setFlights] = useState<Flight[]>([]);
    const [banner, setBanner] = useState<{ id: number; text: string } | null>(
        null,
    );
    const [announce, setAnnounce] = useState("");
    const [now, setNow] = useState(Date.now);
    // Events up to this id were there before you looked: not animated again
    const [firstEvent] = useState(() =>
        Math.max(0, ...game.events.map((e) => e.id)),
    );
    const seenRef = useRef(firstEvent);
    const effectId = useRef(0);

    const finished = game.status === "finished";
    const playing = game.myStatus === "playing" && !finished;
    const count = game.seats.length;
    const me = game.seats[game.mySeat];
    const myTurn =
        playing && game.status === "active" && game.turn === game.mySeat;
    const hand = useMemo(() => sortHand(game.hand), [game.hand]);
    const offset = useMemo(
        () => game.serverNowMs - Date.now(),
        [game.serverNowMs],
    );
    const sideOf = (seat: number) => seatSide(seat, game.mySeat, count);
    const lastPlay = [...game.events]
        .reverse()
        .find(
            (e): e is Extract<CardEvent, { type: "play" }> => e.type === "play",
        );

    const poll = usePoll(POLL_MS, { only: ["game"] }, { autoStart: false });

    useEffect(() => {
        if (finished) {
            poll.stop();
        } else {
            poll.start();
        }
    }, [finished]);

    // Clock for the turn timer
    useEffect(() => {
        if (finished) {
            return;
        }

        const timer = window.setInterval(() => setNow(Date.now()), 200);

        return () => window.clearInterval(timer);
    }, [finished]);

    // After the countdown and the reveal of the page: zoom in, shuffle and deal
    useEffect(() => {
        if (intro === "waiting" && countdownDone && !reveal) {
            setIntro("running");
        }
    }, [intro, countdownDone, reveal]);

    // New events → bubbles, shakes, flying cards and banners
    useEffect(() => {
        const fresh = game.events.filter((e) => e.id > seenRef.current);

        if (fresh.length === 0) {
            return;
        }

        seenRef.current = fresh[fresh.length - 1].id;
        const seat = (s: number) => game.seats[s];
        // Every effect clears itself, unless a newer one took its place
        const later = (clear: () => void) =>
            window.setTimeout(clear, EFFECT_MS);
        const bubble = (s: number, text: string, tone: SeatBubble["tone"]) => {
            const id = ++effectId.current;
            setBubbles((b) => ({ ...b, [s]: { id, text, tone } }));
            later(() =>
                setBubbles((b) => {
                    if (b[s]?.id !== id) return b;
                    const { [s]: _, ...rest } = b;

                    return rest;
                }),
            );
        };
        const shake = (s: number) => {
            const id = ++effectId.current;
            setShakes((sh) => ({ ...sh, [s]: id }));
            later(() =>
                setShakes((sh) => {
                    if (sh[s] !== id) return sh;
                    const { [s]: _, ...rest } = sh;

                    return rest;
                }),
            );
        };
        const flash = (text: string) => {
            const id = ++effectId.current;
            setBanner({ id, text });
            later(() => setBanner((b) => (b?.id === id ? null : b)));
        };
        const newFlights: Flight[] = [];
        const said: string[] = [];

        for (const e of fresh) {
            switch (e.type) {
                case "play":
                    said.push(`${name(seat(e.seat))} legt ${cardSay(e.card)}.`);

                    if (isWild(e.card)) {
                        flash(`Kleur: ${CARD_COLORS[e.color].name}`);
                    }

                    break;
                case "draw":
                    said.push(
                        `${name(seat(e.seat))} pakt ${e.count} ${e.count === 1 ? "kaart" : "kaarten"}.`,
                    );

                    for (let i = 0; i < Math.min(e.count, 4); i++) {
                        newFlights.push({
                            id: `${e.id}-${i}`,
                            to: sideOf(e.seat),
                            delay: i * 90,
                        });
                    }

                    break;
                case "skip":
                    bubble(e.seat, "Beurt over", "info");
                    shake(e.seat);
                    said.push(`${name(seat(e.seat))} slaat een beurt over.`);
                    break;
                case "reverse":
                    flash("Richting om!");
                    said.push("De speelrichting draait om.");
                    break;
                case "last":
                    bubble(e.seat, "Laatste!", "alert");
                    said.push(`${name(seat(e.seat))} roept: laatste!`);
                    break;
                case "caught":
                    bubble(e.seat, `+${e.count} straf`, "alert");
                    shake(e.seat);
                    flash(
                        `${name(seat(e.by))} betrapt ${name(seat(e.seat)).toLowerCase() === "jij" ? "jou" : name(seat(e.seat))}!`,
                    );
                    said.push(
                        `${name(seat(e.seat))} vergat laatste te roepen en pakt ${e.count} strafkaarten.`,
                    );
                    break;
                case "timeout":
                    bubble(e.seat, "Tijd op", "info");
                    break;
                case "forfeit":
                    bubble(e.seat, "Opgegeven", "info");
                    said.push(`${name(seat(e.seat))} geeft op.`);
                    break;
                case "takeover":
                    bubble(e.seat, "NPC neemt over", "info");
                    said.push(
                        `${name(seat(e.seat))} is weg: een NPC speelt verder.`,
                    );
                    break;
                case "reshuffle":
                    flash("Stapel opnieuw geschud");
                    break;
                case "swap":
                    flash(
                        `${name(seat(e.seat))} ruilt van hand met ${name(seat(e.target))}`,
                    );
                    break;
                case "rotate":
                    flash("Alle handen schuiven door");
                    break;
            }
        }

        if (!reduced && newFlights.length > 0) {
            setFlights((f) => [...f, ...newFlights]);
            later(() =>
                setFlights((f) => f.filter((x) => !newFlights.includes(x))),
            );
        }

        if (said.length > 0) {
            setAnnounce(said.join(" "));
        }
    }, [game.events]);

    const send = (
        url: string,
        data: Parameters<typeof router.post>[1] = {},
    ) => {
        setPending(true);
        setError(null);
        router.post(url, data, {
            ...keep,
            onError: (errors) =>
                setError(
                    errors.move ?? Object.values(errors)[0] ?? "Dat mag niet.",
                ),
            onFinish: () => setPending(false),
        });
    };

    const play = (card: CardCode, color?: CardColor, target?: number) => {
        setPicking(null);
        send(tribekaarten.play.url(game.id), {
            card,
            color: color ?? null,
            target: target ?? null,
        });
    };

    const choose = (card: CardCode) => {
        const swaps =
            game.houseRules.includes("zero_seven") &&
            cardValue(card) === "7" &&
            hand.length > 1;

        if (isWild(card)) {
            setPicking({ card, step: "color" });
        } else if (swaps) {
            setPicking({ card, step: "swap" });
        } else {
            play(card);
        }
    };

    const draw = () => send(tribekaarten.draw.url(game.id));
    const pass = () => send(tribekaarten.pass.url(game.id));
    const callLast = () =>
        router.post(tribekaarten.last.url(game.id), {}, keep);

    const canDraw =
        myTurn && !pending && game.drawn === null && intro === "done";
    const canPass = myTurn && !pending && game.drawn !== null;
    // "LAATSTE!" lights up when it matters: your second-last card, or someone on one card
    const lastMatters =
        playing &&
        ((myTurn && hand.length === 2) ||
            game.seats.some(
                (s) =>
                    !s.isMe &&
                    s.cardCount === 1 &&
                    (s.status === "playing" ||
                        s.status === "npc" ||
                        s.status === "taken-over"),
            ));

    // Keyboard: P = pakken, H = houden, L = laatste
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;

            if (
                e.ctrlKey ||
                e.metaKey ||
                e.altKey ||
                picking ||
                target.closest("input, textarea, dialog")
            ) {
                return;
            }

            const key = e.key.toLowerCase();

            if (key === "p" && canDraw) {
                draw();
            } else if (key === "h" && canPass) {
                pass();
            } else if (key === "l" && playing) {
                callLast();
            }
        };
        window.addEventListener("keydown", onKey);

        return () => window.removeEventListener("keydown", onKey);
    });

    const rematch = useGameQueue<CardQueueState>(tribekaarten, (match) =>
        router.visit(tribekaarten.show.url(match.gameId)),
    );

    const backToHotel = () => {
        setConfirmLeave(false);
        setLeaving(true);
    };

    const turnLeft =
        game.turnEndsAtMs !== null && game.status === "active"
            ? Math.max(0, game.turnEndsAtMs - (now + offset))
            : null;
    const turnPercent =
        turnLeft === null
            ? null
            : Math.min(100, (turnLeft / (game.turnSeconds * 1000)) * 100);
    const turnSeat = game.seats[game.turn];

    const status = (() => {
        if (finished) return "Potje afgelopen";
        if (game.status !== "active" || intro !== "done")
            return "De kaarten worden gedeeld…";
        if (!playing) return `${name(turnSeat)} is aan de beurt`;
        if (myTurn && game.pendingDraw > 0)
            return `Stapel een +kaart of pak ${game.pendingDraw} kaarten`;
        if (myTurn && game.drawn) return "Leg de nieuwe kaart of houd hem";
        if (myTurn)
            return game.playable.length > 0
                ? "Jij bent aan de beurt"
                : "Niets past: pak een kaart";
        return `${name(turnSeat)} ${turnSeat.isNpc || turnSeat.status === "taken-over" ? "denkt na…" : "is aan de beurt"}`;
    })();

    const colorCounts = Object.fromEntries(
        COLOR_ORDER.map((c) => [
            c,
            hand.filter((card) => cardColor(card) === c).length,
        ]),
    ) as Record<CardColor, number>;

    const showTable = intro !== "waiting";

    return (
        <>
            <Head title="Tribekaarten" />
            <PageHeader
                title="Tribekaarten"
                actions={
                    <GameActions
                        playing={playing}
                        onResign={() => setConfirmResign(true)}
                        onLeave={() =>
                            playing ? setConfirmLeave(true) : backToHotel()
                        }
                    />
                }
            />

            <div className="relative h-dvh overflow-hidden lg:h-[calc(100vh-72px)]">
                <div className="flex h-full flex-col overflow-y-auto bg-ink bg-[repeating-conic-gradient(rgb(255_255_255/0.035)_0_25%,transparent_0_50%)] bg-[length:48px_48px]">
                    {/* Tafel in bovenaanzicht: spelers rondom, stapels in het midden */}
                    <div className="relative mx-auto min-h-[340px] w-full max-w-4xl flex-1 px-2 pt-2 sm:min-h-[400px]">
                        <div
                            className={cn(
                                "absolute inset-x-[13%] inset-y-[16%] rounded-[28px] border-4 border-ink bg-[#7A5230] p-2 shadow-[0_8px_0_0_rgb(0_0_0/0.35)] sm:inset-x-[16%]",
                                intro === "running" && "animate-table-zoom",
                                !showTable && "invisible",
                            )}
                        >
                            <div className="relative h-full w-full rounded-[20px] border-2 border-[#5C3C1F] bg-[#0F766E] bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] bg-[length:8px_8px]" />
                        </div>

                        {showTable && (
                            <>
                                <TableCenter
                                    game={game}
                                    lastPlay={lastPlay}
                                    // Only a card played while you watch flies in
                                    fromSide={
                                        lastPlay && lastPlay.id > firstEvent
                                            ? sideOf(lastPlay.seat)
                                            : null
                                    }
                                    hidden={intro !== "done"}
                                    reduced={reduced}
                                    canDraw={canDraw}
                                    canPass={canPass}
                                    onDraw={draw}
                                />

                                {game.seats.map((seat) => (
                                    <div
                                        key={seat.seat}
                                        className={cn(
                                            "absolute z-10",
                                            SEAT_CLASSES[sideOf(seat.seat)],
                                            seat.isMe && "hidden sm:block",
                                        )}
                                    >
                                        <TableSeat
                                            seat={seat}
                                            side={sideOf(seat.seat)}
                                            active={
                                                game.status === "active" &&
                                                !finished &&
                                                game.turn === seat.seat
                                            }
                                            timerPercent={
                                                game.turn === seat.seat
                                                    ? turnPercent
                                                    : null
                                            }
                                            bubble={bubbles[seat.seat] ?? null}
                                            shake={shakes[seat.seat] ?? null}
                                        />
                                    </div>
                                ))}

                                {flights.map((f) => (
                                    <div
                                        key={f.id}
                                        aria-hidden
                                        className="pointer-events-none absolute z-20"
                                        style={
                                            {
                                                "--from-x": ANCHORS.pile.x,
                                                "--from-y": ANCHORS.pile.y,
                                                "--to-x": ANCHORS[f.to].x,
                                                "--to-y": ANCHORS[f.to].y,
                                                "--to-s":
                                                    f.to === "bottom"
                                                        ? 1.1
                                                        : 0.6,
                                                animation: `card-fly 420ms cubic-bezier(0.3, 0.7, 0.4, 1) ${f.delay}ms both, pixel-off 1ms linear ${f.delay + 480}ms both`,
                                            } as CSSProperties
                                        }
                                    >
                                        <PixelCard
                                            card={null}
                                            className="w-12 sm:w-14"
                                        />
                                    </div>
                                ))}

                                {banner && (
                                    <p
                                        key={banner.id}
                                        aria-hidden
                                        className="pointer-events-none absolute top-[24%] left-1/2 z-30 -translate-x-1/2 animate-perfect-pop rounded-input border-2 border-ink bg-sunshine px-3 py-1 font-pixel text-[13px] whitespace-nowrap text-ink uppercase shadow-[3px_3px_0_0_rgb(15_30_58)] [animation-duration:1700ms] sm:text-[15px]"
                                    >
                                        {banner.text}
                                    </p>
                                )}

                                {intro === "running" && (
                                    <DealIntro
                                        sides={game.seats.map((s) =>
                                            sideOf(s.seat),
                                        )}
                                        handSize={7}
                                        onDone={() => setIntro("done")}
                                    />
                                )}
                            </>
                        )}
                    </div>

                    {/* Status, je hand en de knoppen */}
                    <div className="relative z-10 mx-auto w-full max-w-4xl px-2 pb-3">
                        <p
                            role="status"
                            className={cn(
                                "mx-auto w-fit rounded-pill px-3 py-1 text-center font-pixel text-[11px] uppercase sm:text-[12px]",
                                myTurn
                                    ? "bg-sunshine text-ink"
                                    : "bg-white/10 text-white",
                            )}
                        >
                            {status}
                            {myTurn && turnLeft !== null && (
                                <span className="ml-2 tabular-nums">
                                    {Math.ceil(turnLeft / 1000)}s
                                </span>
                            )}
                        </p>
                        <p aria-live="polite" className="sr-only">
                            {announce}
                        </p>
                        {error && (
                            <p
                                role="alert"
                                className="mx-auto mt-1 w-fit rounded-input bg-[#E84A3A] px-2 py-0.5 text-caption text-white"
                            >
                                {error}
                            </p>
                        )}

                        {intro === "done" && playing && (
                            <Hand
                                hand={hand}
                                playable={game.playable}
                                drawn={game.drawn}
                                disabled={!myTurn || pending}
                                onPlay={choose}
                            />
                        )}
                        {!playing && !finished && (
                            <div className="mx-auto mt-3 flex max-w-sm flex-col items-center gap-2 rounded-card bg-white/10 p-3 text-center text-small text-white">
                                {game.myStatus === "taken-over"
                                    ? "Je was te lang weg: een NPC heeft je plek aan tafel overgenomen."
                                    : "Je doet niet meer mee aan dit potje. Kijk mee of ga terug."}
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={backToHotel}
                                >
                                    Terug naar kantine
                                </Button>
                            </div>
                        )}

                        {playing && (
                            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={draw}
                                    disabled={!canDraw}
                                    aria-keyshortcuts="P"
                                    className="h-11 rounded-pill border-2 border-ink bg-white px-4 font-pixel text-[12px] text-ink uppercase shadow-[3px_3px_0_0_rgb(0_0_0/0.35)] transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
                                >
                                    {game.pendingDraw > 0 && myTurn
                                        ? `Pak ${game.pendingDraw}`
                                        : "Pak kaart"}
                                </button>
                                {canPass && (
                                    <button
                                        type="button"
                                        onClick={pass}
                                        aria-keyshortcuts="H"
                                        className="h-11 rounded-pill border-2 border-ink bg-white px-4 font-pixel text-[12px] text-ink uppercase shadow-[3px_3px_0_0_rgb(0_0_0/0.35)] hover:-translate-y-0.5"
                                    >
                                        Houden
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={callLast}
                                    disabled={game.status !== "active"}
                                    aria-keyshortcuts="L"
                                    className={cn(
                                        "h-11 rounded-pill border-2 border-ink px-5 font-pixel text-[14px] text-white uppercase shadow-[3px_3px_0_0_rgb(0_0_0/0.35)] transition-transform hover:-translate-y-0.5 disabled:opacity-40",
                                        lastMatters
                                            ? "animate-turn-glow bg-[#E84A3A]"
                                            : "bg-[#B42318]/80",
                                    )}
                                >
                                    Laatste!
                                </button>
                            </div>
                        )}

                        {/* Mobiel: geen paginaheader, dus de knoppen hier */}
                        <div className="mt-2 flex justify-center lg:hidden">
                            <GameActions
                                playing={playing}
                                onResign={() => setConfirmResign(true)}
                                onLeave={() =>
                                    playing
                                        ? setConfirmLeave(true)
                                        : backToHotel()
                                }
                            />
                        </div>
                        {me && (
                            <p className="mt-1 text-center text-caption text-white/60 sm:hidden">
                                Jij: @{me.username} · {hand.length}{" "}
                                {hand.length === 1 ? "kaart" : "kaarten"}
                            </p>
                        )}
                    </div>
                </div>

                {picking?.step === "color" && (
                    <ColorPicker
                        counts={colorCounts}
                        onPick={(color) => play(picking.card, color)}
                        onCancel={() => setPicking(null)}
                    />
                )}
                {picking?.step === "swap" && (
                    <SwapPicker
                        seats={game.seats.filter(
                            (s) =>
                                !s.isMe &&
                                s.status !== "forfeited" &&
                                s.status !== "left",
                        )}
                        onPick={(target) =>
                            play(picking.card, undefined, target)
                        }
                        onCancel={() => setPicking(null)}
                    />
                )}

                {finished && (
                    <CardEndScreen
                        game={game}
                        again={
                            rematch.state.status === "searching"
                                ? rematch.state
                                : null
                        }
                        onAgain={() =>
                            void rematch.join({
                                room_id: game.roomId,
                                table_id: game.tableId,
                                difficulty: game.npcDifficulty,
                                house_rules: game.houseRules,
                            })
                        }
                        onStartNow={() =>
                            void rematch.send(tribekaarten.startNow.url(), {})
                        }
                        onHotel={backToHotel}
                    />
                )}
                {!countdownDone && (
                    <Countdown
                        label="Het potje begint over"
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
                            router.post(tribekaarten.leave.url(game.id));
                        }}
                    />
                )}
            </div>

            <ConfirmGameExit
                open={confirmResign}
                onClose={() => setConfirmResign(false)}
                title="Potje opgeven?"
                description="Je kaarten gaan terug in de stapel en de anderen spelen verder."
                confirmLabel="Opgeven"
                onConfirm={() => {
                    setConfirmResign(false);
                    router.post(tribekaarten.resign.url(game.id), {}, keep);
                }}
            />

            <ConfirmGameExit
                open={confirmLeave}
                onClose={() => setConfirmLeave(false)}
                title="Potje verlaten?"
                description="Het potje loopt nog: als je nu weggaat geef je op en spelen de anderen zonder jou verder."
                confirmLabel="Opgeven en terug naar kantine"
                onConfirm={backToHotel}
            />
        </>
    );
}

/** "zon 7", "een kleurwissel" — for the screen reader announcements. */
function cardSay(card: CardCode): string {
    const value = cardValue(card);
    const color = cardColor(card);
    const what =
        {
            skip: "beurt overslaan",
            reverse: "richting omdraaien",
            draw2: "+2",
            wild: "kleurwissel",
            wild4: "kleurwissel +4",
        }[value as string] ?? value;

    return color === "wild"
        ? `een ${what}`
        : `${CARD_COLORS[color].name} ${what}`;
}

/**
 * The middle of the table: the draw pile (click to draw), the discard pile
 * with the card that was just played flying in from its player, the
 * current colour (colour, shape and name) and the direction of play.
 */
function TableCenter({
    game,
    lastPlay,
    fromSide,
    hidden,
    reduced,
    canDraw,
    canPass,
    onDraw,
}: {
    game: CardGameState;
    lastPlay: Extract<CardEvent, { type: "play" }> | undefined;
    fromSide: SeatSide | null;
    hidden: boolean;
    reduced: boolean;
    canDraw: boolean;
    canPass: boolean;
    onDraw: () => void;
}) {
    const color = CARD_COLORS[game.color];
    const clockwise = game.direction === 1;

    return (
        <div
            className={cn(
                "pointer-events-none absolute inset-x-[14%] inset-y-[17%] flex items-center justify-center",
                hidden && "invisible",
            )}
        >
            {/* Speelrichting: pijlen rond het midden (staan stil, wijzen de richting aan) */}
            <svg
                viewBox="0 0 100 100"
                aria-hidden
                className="absolute size-[min(92%,340px)] opacity-60"
            >
                {[0, 120, 240].map((angle) => (
                    <g key={angle} transform={`rotate(${angle} 50 50)`}>
                        <path
                            d="M50 4 A46 46 0 0 1 86 22"
                            fill="none"
                            stroke="#FFFFFF"
                            strokeWidth="4"
                            strokeDasharray="6 4"
                        />
                        <path
                            d={
                                clockwise
                                    ? "M84 13 L90 25 L77 25 Z"
                                    : "M44 -2 L56 4 L44 10 Z"
                            }
                            fill="#FFFFFF"
                            transform={
                                clockwise ? undefined : "rotate(180 50 4)"
                            }
                        />
                    </g>
                ))}
            </svg>

            <div className="relative flex items-center gap-10 sm:gap-20">
                <button
                    type="button"
                    onClick={onDraw}
                    disabled={!canDraw}
                    aria-label={`Trekstapel (${game.drawPileCount} kaarten): pak een kaart`}
                    className={cn(
                        "pointer-events-auto relative rounded-[6px] outline-none focus-visible:ring-4 focus-visible:ring-cyan",
                        canDraw && !canPass
                            ? "cursor-pointer hover:-translate-y-1"
                            : "cursor-default",
                    )}
                >
                    <PixelCard
                        card={null}
                        className="absolute top-0 left-0 w-14 sm:w-[72px]"
                    />
                    <span
                        className={cn(
                            "relative block",
                            canDraw && "drop-shadow-[0_0_6px_#22D3EE]",
                        )}
                        style={{ transform: "translate(-3px, -3px)" }}
                    >
                        <PixelCard card={null} className="w-14 sm:w-[72px]" />
                    </span>
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 font-pixel text-[10px] text-white/80">
                        {game.drawPileCount}
                    </span>
                </button>

                <div className="relative">
                    <span
                        key={lastPlay?.id ?? "start"}
                        className="relative block rounded-[8px] p-1"
                        style={{
                            boxShadow: `0 0 0 4px ${color.fill}, 0 0 0 7px #0F1E3A`,
                            ...(fromSide && !reduced
                                ? ({
                                      "--from-x": `${fromSide === "left" ? -260 : fromSide === "right" ? 260 : 0}%`,
                                      "--from-y": `${fromSide === "top" ? -200 : fromSide === "bottom" ? 240 : 0}%`,
                                      animation:
                                          "card-land 380ms cubic-bezier(0.3, 0.7, 0.4, 1) both",
                                  } as CSSProperties)
                                : {}),
                        }}
                    >
                        <PixelCard
                            card={game.top}
                            className="w-14 sm:w-[72px]"
                        />
                    </span>
                    {/* Huidige kleur: kleur + vorm + naam */}
                    <span
                        className="absolute -bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-pill border-2 border-ink px-2 py-0.5 font-pixel text-[10px] whitespace-nowrap text-white uppercase"
                        style={{ background: color.dark }}
                    >
                        <svg
                            viewBox="0 0 5 5"
                            shapeRendering="crispEdges"
                            aria-hidden
                            className="size-2.5"
                        >
                            <path
                                d={spritePath(SHAPES[game.color])}
                                fill="#FFFFFF"
                            />
                        </svg>
                        {color.name}
                    </span>
                </div>
            </div>

            {/* De richting staat alleen in de pijlen; voor schermlezers ook als tekst */}
            <p className="sr-only">
                {clockwise ? "Met de klok mee" : "Tegen de klok in"}
            </p>
            {game.pendingDraw > 0 && (
                <p className="absolute bottom-0 font-pixel text-[10px] uppercase">
                    <span className="rounded-pill bg-[#E84A3A] px-1.5 text-white">
                        +{game.pendingDraw} klaar
                    </span>
                </p>
            )}
        </div>
    );
}
