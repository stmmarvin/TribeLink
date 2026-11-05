import { useState } from "react";
import { GamePopup } from "@/components/games/game-popup";
import { DIFFICULTY_LABELS, NPC_NAME } from "@/lib/chess/npc";
import { cn } from "@/lib/utils";
import type { ChessDifficulty, ChessQueueState } from "@/types";
import { PixelPiece } from "./pixel-piece";

const DIFFICULTIES: ChessDifficulty[] = ["easy", "normal", "hard"];

/**
 * Small pixel popup in the Hotel after clicking a chess board: pick the NPC
 * difficulty, join, and wait for a second player (or the NPC).
 */
export function ChessJoinPopup({
    state,
    error,
    onJoin,
    onCancel,
    onClose,
}: {
    state: ChessQueueState;
    error: boolean;
    onJoin: (difficulty: ChessDifficulty) => void;
    onCancel: () => void;
    onClose: () => void;
}) {
    const [difficulty, setDifficulty] = useState<ChessDifficulty>("normal");
    const searching = state.status === "searching";

    return (
        <GamePopup
            title="Schaakpartij joinen"
            onClose={searching ? onCancel : onClose}
        >
            <div className="flex items-center justify-center gap-1" aria-hidden>
                <PixelPiece
                    type="n"
                    color="white"
                    className={cn("size-10", searching && "animate-bounce")}
                />
                <span className="font-pixel text-[14px] text-ink-muted">
                    vs
                </span>
                <PixelPiece
                    type="n"
                    color="black"
                    className={cn(
                        "size-10 -scale-x-100",
                        searching && "animate-bounce [animation-delay:200ms]",
                    )}
                />
            </div>

            {searching ? (
                <>
                    <p
                        role="status"
                        className="text-center font-pixel text-[12px] text-ink uppercase"
                    >
                        Wachten op een tegenstander…
                    </p>
                    <p className="text-center text-caption text-ink-secondary">
                        {state.npcInSeconds > 0
                            ? `Komt er niemand, dan speel je over ${state.npcInSeconds}s tegen ${NPC_NAME}.`
                            : `${NPC_NAME} schuift aan…`}
                    </p>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="h-10 rounded-pill border-[1.5px] border-line font-jakarta text-label text-ink-secondary hover:bg-subtle"
                    >
                        Annuleren
                    </button>
                </>
            ) : (
                <>
                    <p className="text-center text-caption text-ink-secondary">
                        Speel tegen wie er ook aan dit bord gaat zitten. Is er
                        niemand, dan neemt de NPC het tegen je op.
                    </p>
                    <fieldset>
                        <legend className="mb-1.5 font-pixel text-[11px] text-ink-secondary uppercase">
                            Moeilijkheid NPC
                        </legend>
                        <div className="grid grid-cols-3 gap-1">
                            {DIFFICULTIES.map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    aria-pressed={difficulty === d}
                                    onClick={() => setDifficulty(d)}
                                    className={cn(
                                        "h-9 rounded-input border-2 font-pixel text-[10px] uppercase transition-colors",
                                        difficulty === d
                                            ? "border-blue bg-blue/10 text-blue-aa"
                                            : "border-line text-ink-secondary hover:bg-subtle",
                                    )}
                                >
                                    {DIFFICULTY_LABELS[d]}
                                </button>
                            ))}
                        </div>
                    </fieldset>
                    {error && (
                        <p role="alert" className="text-caption text-[#B42318]">
                            Joinen lukte niet. Probeer het opnieuw.
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={() => onJoin(difficulty)}
                        className="h-10 rounded-pill bg-brand-aa font-pixel text-[12px] text-white uppercase transition-colors hover:bg-brand"
                    >
                        Joinen
                    </button>
                </>
            )}
        </GamePopup>
    );
}
