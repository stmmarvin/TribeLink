import type { AvatarLook } from "@/game/types";

export type ChessColor = "white" | "black";

export type ChessDifficulty = "easy" | "normal" | "hard";

/** Why a game ended (ChessGame::play / forfeit / the disconnect timeout). */
export type ChessEndReason =
    | "checkmate"
    | "stalemate"
    | "insufficient-material"
    | "threefold-repetition"
    | "fifty-moves"
    | "resign"
    | "left"
    | "timeout";

export type ChessPlayer = {
    /** null for the NPC. */
    id: number | null;
    username: string;
    isNpc: boolean;
    /** Hotel avatar of the player, null when they never were in the Hotel (or the NPC). */
    look: AvatarLook | null;
};

/**
 * A chess game from ChessController (prop `game`), polled by the game page:
 * countdown → active → finished. Moves are UCI (`e2e4`, `e7e8q`).
 */
export type ChessGameState = {
    id: number;
    roomId: string;
    boardId: string;
    status: "countdown" | "active" | "finished";
    startsAt: string;
    /** Server clock, to line up the countdown on both screens. */
    serverNow: string;
    myColor: ChessColor;
    white: ChessPlayer;
    black: ChessPlayer;
    npcDifficulty: ChessDifficulty | null;
    fen: string;
    moves: string[];
    pgn: string;
    result: "1-0" | "0-1" | "1/2-1/2" | null;
    winner: ChessColor | null;
    endReason: ChessEndReason | null;
};

/** Your place at a chess board while you wait (ChessController::queueState). */
export type ChessQueueState =
    | { status: "idle" }
    | { status: "searching"; npcInSeconds: number }
    | {
          status: "matched";
          gameId: number;
          startsAt: string;
          serverNow: string;
      };
