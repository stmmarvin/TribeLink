import { useEffect, useState } from "react";
import { GamePopup } from "@/components/games/game-popup";
import { DIFFICULTY_LABELS, HOUSE_RULES } from "@/lib/cards";
import { getJson } from "@/lib/http";
import { cn } from "@/lib/utils";
import { table } from "@/routes/tribekaarten";
import type { CardDifficulty, CardHouseRule, CardQueueState } from "@/types";
import { JoinError, JoinSteps } from "./join-steps";
import { PixelCard } from "./pixel-card";

const MAX_PLAYERS = 4;

/**
 * Popup in the Hotel after clicking the card table: who's waiting there and
 * how often you won, the NPC difficulty and house rules (the first player at
 * the table decides), then waiting for other players. While waiting you can
 * start right away with NPCs, or keep waiting for students.
 */
export function CardJoinPopup({
    roomId,
    tableId,
    state,
    error,
    onJoin,
    onStartNow,
    onWait,
    onCancel,
    onClose,
}: {
    roomId: string;
    tableId: string;
    state: CardQueueState;
    error: boolean;
    onJoin: (difficulty: CardDifficulty, houseRules: CardHouseRule[]) => void;
    onStartNow: () => void;
    onWait: (wait: boolean) => void;
    onCancel: () => void;
    onClose: () => void;
}) {
    const [difficulty, setDifficulty] = useState<CardDifficulty>("normal");
    const [rules, setRules] = useState<CardHouseRule[]>([]);
    const [info, setInfo] = useState<{
        waiting: string[];
        wins: number;
    } | null>(null);
    const searching = state.status === "searching" ? state : null;

    // Before joining: who sits at the table now (refreshed every few seconds)
    useEffect(() => {
        if (searching) {
            return;
        }

        let stopped = false;
        const load = () =>
            getJson<{ waiting: string[]; wins: number }>(
                table.url({ query: { room_id: roomId, table_id: tableId } }),
            )
                .then((next) => !stopped && setInfo(next))
                .catch(() => {});

        void load();
        const timer = window.setInterval(load, 3000);

        return () => {
            stopped = true;
            window.clearInterval(timer);
        };
    }, [roomId, tableId, searching === null]);

    const wins = searching?.wins ?? info?.wins;
    const toggleRule = (rule: CardHouseRule) =>
        setRules((current) =>
            current.includes(rule)
                ? current.filter((r) => r !== rule)
                : [...current, rule],
        );

    return (
        <GamePopup
            title="Kaartspel joinen"
            onClose={searching ? onCancel : onClose}
        >
            <div
                className="flex items-end justify-center gap-1 pt-1"
                aria-hidden
            >
                {(["sun:7", "wild:wild", "sea:reverse"] as const).map(
                    (card, i) => (
                        <PixelCard
                            key={card}
                            card={card}
                            className={cn(
                                "w-10 drop-shadow-[2px_2px_0_rgb(15_30_58/0.4)]",
                                i === 0 && "-rotate-12",
                                i === 1 && "-translate-y-1",
                                i === 2 && "rotate-12",
                                searching && "motion-safe:animate-bounce",
                                searching &&
                                    i === 1 &&
                                    "[animation-delay:150ms]",
                                searching &&
                                    i === 2 &&
                                    "[animation-delay:300ms]",
                            )}
                        />
                    ),
                )}
            </div>

            <p className="text-center font-pixel text-[11px] text-ink-secondary uppercase">
                Tribekaarten · 2–4 spelers
                {wins !== undefined && (
                    <>
                        <br />
                        <span className="text-ink">
                            {wins} {wins === 1 ? "potje" : "potjes"} gewonnen
                        </span>
                    </>
                )}
            </p>

            {searching ? (
                <>
                    {searching.full ? (
                        <p
                            role="status"
                            className="text-center text-caption text-ink-secondary"
                        >
                            De tafel is vol. Je schuift aan bij het volgende
                            potje.
                        </p>
                    ) : (
                        <>
                            <div>
                                <p className="mb-1.5 font-pixel text-[11px] text-ink-secondary uppercase">
                                    Aan tafel ({searching.players.length}/
                                    {MAX_PLAYERS})
                                </p>
                                <ul className="grid grid-cols-2 gap-1">
                                    {Array.from(
                                        { length: MAX_PLAYERS },
                                        (_, i) => searching.players[i],
                                    ).map((player, i) => (
                                        <li
                                            key={i}
                                            className={cn(
                                                "truncate rounded-input border-2 px-2 py-1.5 text-caption",
                                                player
                                                    ? "border-blue bg-blue/10 text-ink"
                                                    : "border-dashed border-line text-ink-muted",
                                            )}
                                        >
                                            {player
                                                ? `@${player.username}${player.isMe ? " (jij)" : ""}`
                                                : "Vrije stoel"}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {searching.host && !searching.host.isMe && (
                                <p className="text-caption text-ink-secondary">
                                    @{searching.host.username} koos:{" "}
                                    {DIFFICULTY_LABELS[
                                        searching.host.difficulty
                                    ].toLowerCase()}{" "}
                                    NPC&apos;s
                                    {searching.host.houseRules.length > 0
                                        ? `, ${searching.host.houseRules.map((r) => HOUSE_RULES[r].label).join(" en ")}`
                                        : ", geen huisregels"}
                                    .
                                </p>
                            )}
                            <p
                                role="status"
                                className="text-center font-pixel text-[12px] text-ink uppercase"
                            >
                                {searching.startsInSeconds === null
                                    ? "Wachten op spelers…"
                                    : searching.startsInSeconds > 0
                                      ? `Start over ${searching.startsInSeconds}s`
                                      : "Kaarten worden geschud…"}
                            </p>
                            {searching.startsInSeconds !== null &&
                                searching.players.length < 2 && (
                                    <p className="-mt-2 text-center text-caption text-ink-secondary">
                                        Komt er niemand, dan speel je tegen een
                                        NPC.
                                    </p>
                                )}
                            <button
                                type="button"
                                onClick={onStartNow}
                                className="h-10 rounded-pill bg-brand-aa font-pixel text-[12px] text-white uppercase transition-colors hover:bg-brand"
                            >
                                Nu starten met NPC&apos;s
                            </button>
                            <button
                                type="button"
                                aria-pressed={searching.waitingForPlayers}
                                onClick={() =>
                                    onWait(!searching.waitingForPlayers)
                                }
                                className={cn(
                                    "h-10 rounded-pill border-2 font-pixel text-[11px] uppercase transition-colors",
                                    searching.waitingForPlayers
                                        ? "border-blue bg-blue/10 text-blue-aa"
                                        : "border-line text-ink-secondary hover:bg-subtle",
                                )}
                            >
                                {searching.waitingForPlayers
                                    ? "Toch automatisch starten"
                                    : "Wachten op spelers"}
                            </button>
                        </>
                    )}
                    {error && <JoinError />}
                    <button
                        type="button"
                        onClick={onCancel}
                        className="h-10 rounded-pill border-[1.5px] border-line font-jakarta text-label text-ink-secondary hover:bg-subtle"
                    >
                        Annuleren
                    </button>
                </>
            ) : (
                <JoinSteps
                    info={info}
                    difficulty={difficulty}
                    rules={rules}
                    error={error}
                    onDifficulty={setDifficulty}
                    onToggleRule={toggleRule}
                    onJoin={() => onJoin(difficulty, rules)}
                />
            )}
        </GamePopup>
    );
}
