import type { PieceSymbol } from "chess.js";
import { AvatarPreview } from "@/components/hotel/AvatarPreview";
import { DEFAULT_LOOK } from "@/game/look";
import { NPC_LOOK } from "@/lib/chess/npc";
import { cn } from "@/lib/utils";
import type { ChessColor, ChessPlayer } from "@/types";
import { PixelPiece } from "./pixel-piece";

const PIECE_VALUE: Record<PieceSymbol, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0,
};

/**
 * Name, avatar and colour of one player, whether they're up, and the
 * pieces they captured (with the material lead, like on chess sites).
 */
export function PlayerCard({
    player,
    color,
    isMe,
    toMove,
    captured,
    lead,
}: {
    player: ChessPlayer;
    color: ChessColor;
    isMe: boolean;
    toMove: boolean;
    /** Opponent pieces this player has taken. */
    captured: PieceSymbol[];
    lead: number;
}) {
    // Per soort gegroepeerd (pionnen eerst, dame laatst), zoals chess.com
    const groups = (["p", "n", "b", "r", "q"] as const)
        .map((type) => ({
            type,
            count: captured.filter((t) => t === type).length,
        }))
        .filter((group) => group.count > 0);

    return (
        <div
            className={cn(
                "flex items-center gap-3 rounded-card border-2 bg-surface px-3 py-2 transition-colors",
                toMove
                    ? "border-teal shadow-[0_0_0_3px_rgb(20_184_166/0.25)]"
                    : "border-transparent",
            )}
        >
            {/* Alleen hoofd en schouders: in het canvas (2× zo hoog als breed) zit het hoofd bovenaan, de benen eronder vallen weg */}
            <div className="flex size-12 shrink-0 items-start justify-center overflow-hidden rounded-tile bg-media-gradient">
                <AvatarPreview
                    look={
                        player.isNpc ? NPC_LOOK : (player.look ?? DEFAULT_LOOK)
                    }
                    size={40}
                    className="shrink-0"
                />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex min-w-0 items-center gap-2">
                    <span
                        aria-hidden
                        className={cn(
                            "size-3 shrink-0 border-2 border-ink",
                            color === "white" ? "bg-white" : "bg-ink",
                        )}
                    />
                    <span className="truncate font-jakarta text-label text-ink">
                        {player.isNpc
                            ? `🤖 ${player.username}`
                            : `@${player.username}`}
                        {isMe && <span className="text-ink-muted"> (jij)</span>}
                    </span>
                </div>
                <div
                    className="flex h-5 items-end gap-1"
                    aria-label={`Geslagen stukken: ${captured.length}`}
                >
                    {groups.map(({ type, count }) => (
                        <span key={type} className="flex items-end">
                            {Array.from({ length: count }, (_, i) => (
                                <PixelPiece
                                    key={i}
                                    type={type}
                                    color={
                                        color === "white" ? "black" : "white"
                                    }
                                    className={cn("size-5", i > 0 && "-ml-3")}
                                />
                            ))}
                        </span>
                    ))}
                    {lead > 0 && (
                        <span className="ml-1 font-pixel text-[11px] leading-5 text-ink-secondary">
                            +{lead}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export { PIECE_VALUE };
