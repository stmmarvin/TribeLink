import type { AvatarLook } from "@/game/types";

/** Zon (geel), Zee (blauw), Blad (groen) and Vuur (rood). */
export type CardColor = "sun" | "sea" | "leaf" | "fire";

export type CardValue =
    | "0"
    | "1"
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "skip"
    | "reverse"
    | "draw2"
    | "wild"
    | "wild4";

/** A card as `color:value`, like App\Games\Cards\Card: `sun:7`, `sea:skip`, `wild:wild4`. */
export type CardCode = `${CardColor | "wild"}:${CardValue}`;

export type CardDifficulty = "easy" | "normal" | "hard";

/** Keys of config('cards.house_rules'). */
export type CardHouseRule = "stacking" | "zero_seven";

/** playing | npc | taken-over (disconnected) | forfeited | left */
export type CardSeatStatus =
    "playing" | "npc" | "taken-over" | "forfeited" | "left";

export type CardSeat = {
    seat: number;
    username: string;
    isNpc: boolean;
    isMe: boolean;
    status: CardSeatStatus;
    /** Hotel avatar; null when a student never was in the Hotel. */
    look: AvatarLook | null;
    cardCount: number;
    /** Final standing, once the game is over. */
    cardsLeft: number | null;
    isWinner: boolean;
};

/** What happened at the table, for the animations (CardRules::$events). */
export type CardEvent = { id: number } & (
    | { type: "deal"; card: CardCode }
    | { type: "play"; seat: number; card: CardCode; color: CardColor }
    | { type: "draw"; seat: number; count: number }
    | {
          type:
              | "pass"
              | "timeout"
              | "skip"
              | "win"
              | "forfeit"
              | "takeover"
              | "last";
          seat: number;
      }
    | { type: "reverse" | "rotate"; direction: 1 | -1 }
    | { type: "swap"; seat: number; target: number }
    | { type: "caught"; seat: number; by: number; count: number }
    | { type: "reshuffle"; count: number }
);

/**
 * A game from CardGameController (prop `game`), polled by the game page:
 * countdown → dealing → active → finished. Only your own hand is in here.
 */
export type CardGameState = {
    id: number;
    roomId: string;
    tableId: string;
    status: "countdown" | "dealing" | "active" | "finished";
    startsAt: string;
    serverNow: string;
    serverNowMs: number;
    playStartsAtMs: number;
    turnEndsAtMs: number | null;
    turnSeconds: number;
    mySeat: number;
    myStatus: CardSeatStatus;
    seats: CardSeat[];
    hand: CardCode[];
    /** Cards you may play now (empty when it isn't your turn). */
    playable: CardCode[];
    /** The card you just drew and may still play. */
    drawn: CardCode | null;
    top: CardCode;
    color: CardColor;
    direction: 1 | -1;
    turn: number;
    pendingDraw: number;
    drawPileCount: number;
    houseRules: CardHouseRule[];
    npcDifficulty: CardDifficulty;
    turns: number;
    events: CardEvent[];
    winnerSeat: number | null;
    endReason: "won" | "last-standing" | "abandoned" | null;
    wins: number;
};

/** Your place at the card table while you wait (CardGameController::queueState). */
export type CardQueueState =
    | { status: "idle" }
    | {
          status: "searching";
          /** Four students already sit at the table. */
          full: boolean;
          players: Array<{ username: string; isMe: boolean }>;
          /** null: someone chose "Wachten op spelers". */
          startsInSeconds: number | null;
          waitingForPlayers: boolean;
          host: {
              username: string;
              isMe: boolean;
              difficulty: CardDifficulty;
              houseRules: CardHouseRule[];
          } | null;
          wins: number;
      }
    | {
          status: "matched";
          gameId: number;
          tableId: string;
          startsAt: string;
          serverNow: string;
      };
