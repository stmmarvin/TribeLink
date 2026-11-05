import {
    useEffect,
    useRef,
    useState,
    type FormEvent,
    type ReactNode,
} from "react";
import { Head, router, usePage } from "@inertiajs/react";
import { ArcadePopup } from "@/components/arcade/arcade-popup";
import { CardJoinPopup } from "@/components/cards/join-popup";
import { ChessJoinPopup } from "@/components/chess/join-popup";
import { Countdown } from "@/components/games/countdown";
import { prefersReducedMotion } from "@/components/games/pixel-transition";
import {
    GameTransition,
    markTransition,
    useTransitionReveal,
} from "@/components/games/transition";
import {
    AvatarEditor,
    ChatLog,
    HotelPanel,
    InfoStand,
    Navigator,
} from "@/components/hotel/HotelPanels";
import { HotelLoader } from "@/components/hotel/hotel-loader";
import { HotelEngine } from "@/game/engine";
import { loadLook, LOOK_KEY } from "@/game/look";
import { useChessQueue } from "@/hooks/use-chess-queue";
import { useGameQueue } from "@/hooks/use-game-queue";
import { getRoomDef } from "@/game/rooms";
import type {
    AvatarLook,
    ChatEntry,
    RemotePlayer,
    Selection,
} from "@/game/types";
import { CABINETS, takeArcadeReturn, type ArcadeCabinet } from "@/lib/arcade";
import { postJson } from "@/lib/http";
import { cn } from "@/lib/utils";
import { usernameFor } from "@/lib/user";
import { ontmoeten } from "@/routes";
import { lobby } from "@/routes/ontmoeten";
import { chat as lobbyChat, sync as lobbySync } from "@/routes/ontmoeten/lobby";
import { show as arcadeGame } from "@/routes/arcade";
import { show as chessGame } from "@/routes/schaken";
import * as tribekaarten from "@/routes/tribekaarten";
import type {
    ArcadeScoreEntry,
    CardQueueState,
    ChessQueueState,
} from "@/types";

type Panel = "navigator" | "avatar" | "log" | null;
type LobbyRoom = { id: string; name: string; peopleCount: number };
type Scoreboards = Record<string, { name: string; scores: ArcadeScoreEntry[] }>;
type SyncResponse = {
    people: RemotePlayer[];
    messages: Array<{
        id: number;
        userId: number;
        username: string;
        body: string;
    }>;
    latestMessageId: number;
    peopleCount: number;
};

/** Multiplayer: zo vaak geef je je avatar door en haal je de anderen op. */
const SYNC_MS = 1000;

/**
 * Hotel — Habbo/bobba-achtige isometrische kamer waarin je rondloopt en chat.
 * De wereld zelf is een <canvas> die door HotelEngine getekend wordt;
 * alle knoppen/panelen eromheen zijn gewone React + Tailwind. Het hotel vult het
 * hele scherm (zonder app-layout, zie app.tsx); binnenkomen gaat via een laadscherm.
 */
export default function HotelPage() {
    // Inertia i.p.v. react-router: gebruiker uit de gedeelde props, ?kamer= uit de huidige URL
    const { props, url } = usePage();
    const user = { username: usernameFor(props.auth.user) };
    const myId = Number(props.auth.user.id);
    const params = new URLSearchParams(url.split("?")[1] ?? "");
    const setParams = (query: { kamer: string }) =>
        router.get(
            lobby.url({ query }),
            {},
            { preserveState: true, preserveScroll: true },
        );
    const roomId = getRoomDef(params.get("kamer") ?? "kantine").id;
    const room = getRoomDef(roomId);
    const lobbyRooms = (props.lobbyRooms ?? []) as LobbyRoom[];
    const currentRoomPeople =
        lobbyRooms.find((lobbyRoom) => lobbyRoom.id === roomId)?.peopleCount ??
        0;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<HotelEngine>(undefined);
    const inputRef = useRef<HTMLInputElement>(null);

    // De outfit op je account (gemaakt bij registratie) wint van die in deze browser
    const [look, setLook] = useState<AvatarLook>(
        () => (props.savedLook as AvatarLook | null) ?? loadLook(),
    );
    const [selection, setSelection] = useState<Selection>(null);
    const [log, setLog] = useState<ChatEntry[]>([]);
    const [people, setPeople] = useState(currentRoomPeople);
    const [panel, setPanel] = useState<Panel>(null);
    const [text, setText] = useState("");
    // Schaken: aangeklikt bord → popup/wachtrij → countdown → pixel-dissolve naar de partij
    const [chessBoard, setChessBoard] = useState<string | null>(null);
    const [chessMatch, setChessMatch] = useState<Extract<
        ChessQueueState,
        { status: "matched" }
    > | null>(null);
    const [goingToGame, setGoingToGame] = useState<number | null>(null);
    // Tribekaarten: aangeklikte kaarttafel → popup/wachtrij → countdown → pixel-dissolve → inzoomen en delen op de spelpagina
    const [cardTable, setCardTable] = useState<string | null>(null);
    const [cardMatch, setCardMatch] = useState<Extract<
        CardQueueState,
        { status: "matched" }
    > | null>(null);
    const [goingToCards, setGoingToCards] = useState<number | null>(null);
    const [reveal, revealDone] = useTransitionReveal();
    const [arcadeNotice, setArcadeNotice] = useState(false);
    // Arcadekast: popup → inzoomen op het scherm → overgang (pixel/golf) naar het spel
    const [cabinet, setCabinet] = useState<ArcadeCabinet | null>(null);
    const [goingToArcade, setGoingToArcade] = useState<ArcadeCabinet | null>(
        null,
    );
    // Terug uit een arcadespel: vanaf die kast uitzoomen (eenmalig, bij het laden van de pagina)
    const [arcadeReturn] = useState(takeArcadeReturn);
    // Laadscherm bij binnenkomen, niet als je terugkomt uit een spel (dan speelt de overgang al)
    const [loading, setLoading] = useState(() => !reveal && !arcadeReturn);
    const [entering, setEntering] = useState(false);
    const [synced, setSynced] = useState(false);
    const [fontsReady, setFontsReady] = useState(false);
    const scoreboards = (props.arcadeScoreboards ?? null) as Scoreboards | null;
    const chessQueue = useChessQueue((match) => {
        setChessBoard(null);
        setChessMatch(match);
    });
    const cardQueue = useGameQueue<CardQueueState>(tribekaarten, (match) => {
        setCardTable(null);
        setCardMatch(match);
    });
    // Voor de engine-events en de sync-lus, die niet bij elke render opnieuw starten
    const roomIdRef = useRef(roomId);
    const lookRef = useRef(look);
    roomIdRef.current = roomId;
    lookRef.current = look;

    // Engine één keer aanmaken (en netjes opruimen bij het verlaten van de pagina)
    useEffect(() => {
        const engine = new HotelEngine(canvasRef.current!, {
            onSelect: setSelection,
            onChat: (e) => setLog((l) => [...l.slice(-199), e]),
            onPeopleChange: setPeople,
            onChess: setChessBoard,
            onCards: setCardTable,
            // Speelbare kasten openen hun popup; de andere volgen nog (tot die tijd alleen een melding)
            onArcade: (id) =>
                CABINETS[id] ? setCabinet(CABINETS[id]) : setArcadeNotice(true),
            // Wat jij zegt gaat naar de server; de anderen krijgen het bij hun volgende sync
            onSay: (body) => {
                postJson(lobbyChat.url(), {
                    room_id: roomIdRef.current,
                    body,
                }).catch(() => {
                    /* niet verstuurd: de anderen zien dit bericht dan niet */
                });
            },
        });
        engineRef.current = engine;
        // Handig bij debuggen: in de browserconsole `__hotel` gebruiken (alleen in dev)
        if (import.meta.env.DEV) Object.assign(window, { __hotel: engine });
        return () => engine.destroy();
    }, []);

    useEffect(() => {
        void document.fonts.ready.then(() => setFontsReady(true));
    }, []);

    useEffect(() => {
        if (!arcadeNotice) return;
        const t = window.setTimeout(() => setArcadeNotice(false), 3000);
        return () => window.clearTimeout(t);
    }, [arcadeNotice]);

    // Kamer (opnieuw) laden bij wisselen van kamer
    useEffect(() => {
        setLog([]);
        engineRef.current?.loadRoom(room, {
            name: user.username,
            motto: "Nieuw in het hotel ✨",
            look,
        });
        if (arcadeReturn && !prefersReducedMotion())
            engineRef.current?.zoomOutFrom(arcadeReturn);
        // `look` bewust niet als dependency: een nieuwe outfit hoeft de kamer niet te herladen
    }, [room, user.username]);

    // Scorebord aan de muur van de Arcade: top 3 van vandaag, één pagina per spel (het bord wisselt)
    useEffect(() => {
        if (!scoreboards) return;
        const pages = Object.values(scoreboards).map(({ name, scores }) =>
            [
                `${name.toUpperCase()} · TOP 3 VANDAAG`,
                ...scores.map((s) => `${s.rank}. @${s.username}\t${s.score}`),
            ].join("\n"),
        );
        engineRef.current?.setFurniText("arcade-scores", pages.join("\f"));
    }, [room, scoreboards]);

    const playArcade = (target: ArcadeCabinet) => {
        setCabinet(null);
        void engineRef.current
            ?.focusFurni(target.cabinet, prefersReducedMotion() ? 0 : 700)
            .then(() => setGoingToArcade(target));
    };

    useEffect(() => {
        setPeople(currentRoomPeople);
    }, [currentRoomPeople]);

    // Multiplayer: elke seconde je avatar doorgeven en zien wie er nog meer is
    useEffect(() => {
        let since: number | null = null;
        let stopped = false;
        let timer = 0;

        const tick = async () => {
            const engine = engineRef.current;
            const state = engine?.myState();

            if (engine && state) {
                try {
                    const res = await postJson<SyncResponse>(lobbySync.url(), {
                        room_id: roomId,
                        ...state,
                        look: lookRef.current,
                        since,
                    });

                    if (stopped) return;
                    setSynced(true);
                    engine.syncRemotes(res.people);
                    for (const m of res.messages)
                        if (m.userId !== myId)
                            engine.remoteSay(m.userId, m.body);
                    since = res.latestMessageId;
                } catch {
                    /* netwerkfout: volgende tick opnieuw */
                }
            }

            if (!stopped) timer = window.setTimeout(tick, SYNC_MS);
        };

        void tick();

        return () => {
            stopped = true;
            window.clearTimeout(timer);
        };
    }, [roomId, myId]);

    useEffect(() => {
        const heartbeat = () => {
            router.post(
                "/ontmoeten/lobby/heartbeat",
                { room_id: roomId },
                {
                    preserveState: true,
                    preserveScroll: true,
                    only: ["lobbyRooms"],
                },
            );
        };

        heartbeat();
        const interval = window.setInterval(heartbeat, 45000);

        return () => window.clearInterval(interval);
    }, [roomId]);

    useEffect(() => {
        engineRef.current?.setLook(look);
        try {
            localStorage.setItem(LOOK_KEY, JSON.stringify(look));
        } catch {
            /* negeren */
        }
    }, [look]);

    // Gewoon beginnen met typen (zoals in Habbo) zet de focus in het chatveld
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement;
            if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey)
                return;
            if (t.closest("input, textarea, [contenteditable]")) return;
            inputRef.current?.focus();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const send = (e: FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        engineRef.current?.sendChat(text);
        engineRef.current?.setTyping(false);
        setText("");
    };

    const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));
    const engine = () => engineRef.current;

    return (
        <>
            <Head title="Hotel" />

            <div className="fixed inset-0 select-none overflow-hidden bg-ink font-body text-ink scheme-light">
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 block touch-none"
                    aria-label={`Kamer ${room.name}`}
                />

                {/* Boven: hotel verlaten, kamernaam (opent navigator) + zoom */}
                <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-2 lg:inset-x-4 lg:top-4">
                    <div className="flex min-w-0 gap-2">
                        <button
                            type="button"
                            onClick={() => router.visit(ontmoeten.url())}
                            aria-label="Hotel verlaten"
                            title="Hotel verlaten"
                            className="pointer-events-auto flex shrink-0 items-center gap-2 rounded-pill bg-ink/70 px-3.5 py-2 font-jakarta text-label text-white cursor-pointer backdrop-blur transition-colors hover:bg-white hover:text-ink focus-visible:bg-white focus-visible:text-ink focus-visible:outline-none active:scale-95"
                        >
                            <span aria-hidden>←</span>
                            <span className="hidden sm:inline">Verlaten</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => toggle("navigator")}
                            className="group pointer-events-auto flex items-center gap-2 rounded-pill bg-ink/70 px-3.5 py-2 text-white cursor-pointer backdrop-blur transition-colors hover:bg-white hover:text-ink focus-visible:bg-white focus-visible:text-ink focus-visible:outline-none active:scale-95"
                        >
                            <span className="size-2 rounded-pill bg-success" />
                            <span className="font-jakarta text-label">
                                {room.name}
                            </span>
                            <span className="text-[12px] text-white/70 group-hover:text-ink-secondary group-focus-visible:text-ink-secondary">
                                {people} online ▾
                            </span>
                        </button>
                    </div>
                    <div className="pointer-events-auto flex gap-1 rounded-pill bg-ink/70 p-1 backdrop-blur">
                        <HudButton
                            label="Uitzoomen"
                            onClick={() => engine()?.zoomBy(-1)}
                        >
                            −
                        </HudButton>
                        <HudButton
                            label="Centreren"
                            onClick={() => engine()?.recenter()}
                        >
                            <svg
                                viewBox="0 0 16 16"
                                className="size-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <circle cx="8" cy="8" r="5" />
                                <circle
                                    cx="8"
                                    cy="8"
                                    r="1"
                                    fill="currentColor"
                                />
                            </svg>
                        </HudButton>
                        <HudButton
                            label="Inzoomen"
                            onClick={() => engine()?.zoomBy(1)}
                        >
                            +
                        </HudButton>
                    </div>
                </div>

                {panel === "navigator" && (
                    <HotelPanel
                        title="Navigator"
                        onClose={() => setPanel(null)}
                    >
                        <Navigator
                            current={roomId}
                            people={people}
                            onPick={(id) => {
                                setParams({ kamer: id });
                                setPanel(null);
                            }}
                        />
                    </HotelPanel>
                )}
                {panel === "avatar" && (
                    <HotelPanel
                        title="Mijn avatar"
                        onClose={() => setPanel(null)}
                    >
                        <AvatarEditor look={look} onChange={setLook} />
                    </HotelPanel>
                )}
                {panel === "log" && (
                    <HotelPanel
                        title="Chatgeschiedenis"
                        onClose={() => setPanel(null)}
                    >
                        <ChatLog entries={log} />
                    </HotelPanel>
                )}

                {arcadeNotice && (
                    <div className="absolute left-1/2 top-14 z-20 flex -translate-x-1/2 items-center gap-2 rounded-pill bg-sunshine px-4 py-2 font-pixel text-[11px] uppercase text-ink shadow-card lg:top-16">
                        <span aria-hidden className="text-[15px] normal-case">
                            🕹️
                        </span>
                        Deze kast komt binnenkort online
                    </div>
                )}

                {cabinet && (
                    <ArcadePopup
                        cabinet={cabinet}
                        myId={myId}
                        onPlay={() => playArcade(cabinet)}
                        onClose={() => setCabinet(null)}
                    />
                )}

                {chessBoard && !chessMatch && (
                    <ChessJoinPopup
                        state={chessQueue.state}
                        error={chessQueue.error}
                        onJoin={(difficulty) =>
                            void chessQueue.join(roomId, chessBoard, difficulty)
                        }
                        onCancel={() => {
                            chessQueue.leave();
                            setChessBoard(null);
                        }}
                        onClose={() => setChessBoard(null)}
                    />
                )}

                {cardTable && !cardMatch && (
                    <CardJoinPopup
                        roomId={roomId}
                        tableId={cardTable}
                        state={cardQueue.state}
                        error={cardQueue.error}
                        onJoin={(difficulty, houseRules) =>
                            void cardQueue.join({
                                room_id: roomId,
                                table_id: cardTable,
                                difficulty,
                                house_rules: houseRules,
                            })
                        }
                        onStartNow={() =>
                            void cardQueue.send(tribekaarten.startNow.url(), {})
                        }
                        onWait={(wait) =>
                            void cardQueue.send(tribekaarten.wait.url(), {
                                wait,
                            })
                        }
                        onCancel={() => {
                            cardQueue.leave();
                            setCardTable(null);
                        }}
                        onClose={() => setCardTable(null)}
                    />
                )}

                {selection && (
                    <InfoStand
                        selection={selection}
                        onClose={() => setSelection(null)}
                        onWave={() => engine()?.waveMe()}
                        onUseFurni={(id) => engine()?.useFurni(id)}
                        onEditAvatar={() => setPanel("avatar")}
                    />
                )}

                {/* Onderbalk: acties + chat */}
                <div className="absolute inset-x-3 bottom-3 z-20 flex flex-col-reverse gap-2 rounded-card border border-white/10 bg-ink/80 p-2 backdrop-blur lg:inset-x-4 lg:bottom-4 lg:flex-row lg:items-center">
                    {/* Alleen iconen (label als tooltip). Mobiel: 6 gelijke kolommen, desktop: ronde knoppen op één rij. */}
                    <div className="grid grid-cols-6 gap-1 lg:flex lg:gap-1.5">
                        <ToolButton
                            active={panel === "navigator"}
                            onClick={() => toggle("navigator")}
                            icon="🧭"
                            label="Kamers"
                        />
                        <ToolButton
                            active={panel === "avatar"}
                            onClick={() => toggle("avatar")}
                            icon="👕"
                            label="Avatar"
                        />
                        <ToolButton
                            active={panel === "log"}
                            onClick={() => toggle("log")}
                            icon="💬"
                            label="Chatlog"
                        />
                        <span className="mx-0.5 hidden w-px shrink-0 bg-white/15 lg:block" />
                        <ToolButton
                            onClick={() => engine()?.waveMe()}
                            icon="👋"
                            label="Zwaai"
                        />
                        <ToolButton
                            onClick={() => engine()?.danceMe()}
                            icon="🕺"
                            label="Dans"
                        />
                        <ToolButton
                            onClick={() => engine()?.sitOnFloor()}
                            icon="🪑"
                            label="Zit"
                        />
                    </div>
                    <form onSubmit={send} className="flex min-w-0 flex-1 gap-2">
                        <input
                            ref={inputRef}
                            value={text}
                            maxLength={100}
                            onChange={(e) => {
                                setText(e.target.value);
                                engine()?.setTyping(e.target.value.length > 0);
                            }}
                            onBlur={() => engine()?.setTyping(false)}
                            placeholder="Stuur een bericht."
                            aria-label="Chatbericht"
                            className="h-10 min-w-0 flex-1 rounded-pill border border-white/15 bg-white px-4 text-small text-ink outline-none placeholder:text-placeholder focus:border-cyan"
                        />
                        <button
                            type="submit"
                            className="h-10 shrink-0 rounded-pill bg-brand-aa px-5 font-jakarta text-label text-white transition-colors hover:bg-brand"
                        >
                            Stuur
                        </button>
                    </form>
                </div>

                {chessMatch && goingToGame === null && (
                    <Countdown
                        label="De partij begint over"
                        startsAt={chessMatch.startsAt}
                        serverNow={chessMatch.serverNow}
                        onDone={() => setGoingToGame(chessMatch.gameId)}
                    />
                )}
                {goingToGame !== null && (
                    <GameTransition
                        kind="pixel"
                        mode="cover"
                        onDone={() => {
                            markTransition("pixel");
                            router.visit(chessGame.url(goingToGame));
                        }}
                    />
                )}
                {cardMatch && goingToCards === null && (
                    <Countdown
                        label="Het potje begint over"
                        startsAt={cardMatch.startsAt}
                        serverNow={cardMatch.serverNow}
                        onDone={() => setGoingToCards(cardMatch.gameId)}
                    />
                )}
                {goingToCards !== null && (
                    <GameTransition
                        kind="pixel"
                        mode="cover"
                        onDone={() => {
                            markTransition("pixel");
                            router.visit(tribekaarten.show.url(goingToCards));
                        }}
                    />
                )}
                {goingToArcade && (
                    <GameTransition
                        kind={goingToArcade.transition}
                        mode="cover"
                        onDone={() => {
                            markTransition(goingToArcade.transition);
                            router.visit(arcadeGame.url(goingToArcade.game));
                        }}
                    />
                )}
                {reveal && (
                    <GameTransition
                        kind={reveal}
                        mode="reveal"
                        onDone={revealDone}
                    />
                )}
                {loading && (
                    <HotelLoader
                        ready={synced && fontsReady}
                        onDone={() => {
                            setLoading(false);
                            setEntering(true);
                        }}
                    />
                )}
                {entering && (
                    <GameTransition
                        kind="pixel"
                        mode="reveal"
                        onDone={() => setEntering(false)}
                    />
                )}
            </div>
        </>
    );
}

function HudButton({
    label,
    onClick,
    children,
}: {
    label: string;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
            className="flex size-8 items-center justify-center rounded-pill font-jakarta text-[16px] font-bold text-white hover:bg-white/15"
        >
            {children}
        </button>
    );
}

function ToolButton({
    icon,
    label,
    active,
    onClick,
}: {
    icon: string;
    /** Alleen als tooltip en voor schermlezers: in beeld staat alleen het icoon. */
    label: string;
    active?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            aria-pressed={active}
            title={label}
            className={cn(
                "flex h-10 min-w-0 items-center justify-center rounded-input transition-colors lg:size-10 lg:shrink-0 lg:rounded-pill",
                active ? "bg-blue" : "bg-white/10 hover:bg-white/20",
            )}
        >
            <span aria-hidden className="text-[18px] leading-none">
                {icon}
            </span>
        </button>
    );
}
