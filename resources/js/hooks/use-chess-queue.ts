import { useGameQueue } from "@/hooks/use-game-queue";
import { cancel, queue, search } from "@/routes/schaken";
import type { ChessDifficulty, ChessQueueState } from "@/types";

type Matched = Extract<ChessQueueState, { status: "matched" }>;

/**
 * Waiting at a chess board (the shared game queue, see useGameQueue):
 * matched with another student or the NPC.
 */
export function useChessQueue(onMatched: (match: Matched) => void) {
    const { state, error, join, leave } = useGameQueue<ChessQueueState>(
        { search, queue, cancel },
        onMatched,
    );

    return {
        state,
        error,
        join: (roomId: string, boardId: string, difficulty: ChessDifficulty) =>
            join({ room_id: roomId, board_id: boardId, difficulty }),
        leave,
    };
}
