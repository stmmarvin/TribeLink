import type { Chess, PieceSymbol, Square } from "chess.js";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ChessColor } from "@/types";
import { PIECE_NAMES, PixelPiece } from "./pixel-piece";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const PROMOTIONS: PieceSymbol[] = ["q", "r", "b", "n"];

export const colorName = (c: "w" | "b"): ChessColor =>
    c === "w" ? "white" : "black";

/**
 * Our own pixel chessboard (instead of react-chessboard), so it matches the
 * hand-drawn Hotel. Every square is a button: click one of your pieces to see
 * where it can go, then click the target. chess.js only shows legal moves;
 * the server checks them again.
 */
export function ChessBoard({
    chess,
    orientation,
    interactive,
    lastMove,
    onMove,
}: {
    chess: Chess;
    orientation: ChessColor;
    /** Your turn and the game is running. */
    interactive: boolean;
    lastMove?: { from: string; to: string };
    onMove: (from: Square, to: Square, promotion?: PieceSymbol) => void;
}) {
    const [selected, setSelected] = useState<Square | null>(null);
    const [promotion, setPromotion] = useState<{
        from: Square;
        to: Square;
    } | null>(null);

    // A selection from an older position (the opponent moved) is dropped
    const fen = chess.fen();
    const [selectedFen, setSelectedFen] = useState(fen);

    if (selectedFen !== fen) {
        setSelectedFen(fen);
        setSelected(null);
        setPromotion(null);
    }

    const myTurn = interactive && colorName(chess.turn()) === orientation;
    const targets = new Set(
        selected && myTurn
            ? chess.moves({ square: selected, verbose: true }).map((m) => m.to)
            : [],
    );
    // Schaak: alleen zetten die het schaak opheffen mogen. Laat zien welke stukken dat kunnen
    const canEscape = new Set(
        myTurn && chess.inCheck()
            ? chess.moves({ verbose: true }).map((m) => m.from)
            : [],
    );
    const checkedKing = chess.inCheck()
        ? chess
              .board()
              .flat()
              .find((p) => p?.type === "k" && p.color === chess.turn())?.square
        : undefined;

    const ranks =
        orientation === "white"
            ? [8, 7, 6, 5, 4, 3, 2, 1]
            : [1, 2, 3, 4, 5, 6, 7, 8];
    const files = orientation === "white" ? FILES : [...FILES].reverse();

    const click = (square: Square) => {
        if (!myTurn) {
            return;
        }

        const piece = chess.get(square);

        if (selected && targets.has(square)) {
            const moving = chess.get(selected);

            if (
                moving?.type === "p" &&
                (square[1] === "8" || square[1] === "1")
            ) {
                setPromotion({ from: selected, to: square });
            } else {
                onMove(selected, square);
            }

            setSelected(null);

            return;
        }

        setSelected(
            piece &&
                colorName(piece.color) === orientation &&
                square !== selected
                ? square
                : null,
        );
    };

    return (
        <div className="relative aspect-square w-full border-4 border-ink bg-ink shadow-[0_6px_0_0_rgb(0_0_0/0.35)]">
            <div className="grid size-full grid-cols-8 grid-rows-8">
                {ranks.map((rank, row) =>
                    files.map((file, col) => {
                        const square = `${file}${rank}` as Square;
                        const piece = chess.get(square);
                        const light = (FILES.indexOf(file) + rank) % 2 === 1;
                        const isTarget = targets.has(square);
                        const isLast =
                            lastMove?.from === square ||
                            lastMove?.to === square;

                        return (
                            <button
                                key={square}
                                type="button"
                                onClick={() => click(square)}
                                disabled={!myTurn}
                                aria-label={`${square}${piece ? `, ${piece.color === "w" ? "witte" : "zwarte"} ${PIECE_NAMES[piece.type]}` : ""}${isTarget ? ", hierheen zetten" : ""}`}
                                aria-pressed={selected === square}
                                className={cn(
                                    "relative flex items-center justify-center outline-none focus-visible:z-10 focus-visible:ring-4 focus-visible:ring-cyan focus-visible:ring-inset",
                                    light ? "bg-[#EBECD0]" : "bg-[#739552]",
                                    myTurn &&
                                        "cursor-pointer disabled:cursor-default",
                                )}
                            >
                                {isLast && (
                                    <span className="absolute inset-0 bg-[#FFFF33]/50" />
                                )}
                                {checkedKing === square && (
                                    <span className="absolute inset-0 bg-[#E84A3A]/75" />
                                )}
                                {selected === square && (
                                    <span className="absolute inset-0 bg-[#FFFF33]/50" />
                                )}
                                {canEscape.has(square) &&
                                    selected !== square && (
                                        <span className="absolute inset-0 shadow-[inset_0_0_0_4px_#F6D32D]" />
                                    )}
                                {piece && (
                                    <PixelPiece
                                        type={piece.type}
                                        color={colorName(piece.color)}
                                        className="relative size-[86%]"
                                    />
                                )}
                                {isTarget &&
                                    (piece ? (
                                        <span className="absolute inset-[4%] border-[6px] border-black/15" />
                                    ) : (
                                        <span className="relative size-[28%] bg-black/15" />
                                    ))}
                                {col === 0 && (
                                    <span
                                        className={cn(
                                            "absolute top-0.5 left-1 font-pixel text-[9px] leading-none font-bold sm:text-[10px]",
                                            light
                                                ? "text-[#739552]"
                                                : "text-[#EBECD0]",
                                        )}
                                    >
                                        {rank}
                                    </span>
                                )}
                                {row === 7 && (
                                    <span
                                        className={cn(
                                            "absolute right-1 bottom-0.5 font-pixel text-[9px] leading-none font-bold sm:text-[10px]",
                                            light
                                                ? "text-[#739552]"
                                                : "text-[#EBECD0]",
                                        )}
                                    >
                                        {file}
                                    </span>
                                )}
                            </button>
                        );
                    }),
                )}
            </div>

            {promotion && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/60">
                    <div
                        role="dialog"
                        aria-label="Kies een stuk voor promotie"
                        className="border-4 border-ink bg-surface p-3 shadow-[4px_4px_0_0_rgb(15_30_58)]"
                    >
                        <p className="mb-2 text-center font-pixel text-[12px] text-ink uppercase">
                            Promotie
                        </p>
                        <div className="flex gap-2">
                            {PROMOTIONS.map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    aria-label={PIECE_NAMES[type]}
                                    onClick={() => {
                                        onMove(
                                            promotion.from,
                                            promotion.to,
                                            type,
                                        );
                                        setPromotion(null);
                                    }}
                                    className="size-14 border-2 border-line bg-subtle p-1 focus-ring hover:border-blue hover:bg-blue/10"
                                >
                                    <PixelPiece
                                        type={type}
                                        color={orientation}
                                    />
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => setPromotion(null)}
                            className="mt-2 w-full font-pixel text-[11px] text-ink-secondary uppercase hover:text-ink"
                        >
                            Annuleren
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
