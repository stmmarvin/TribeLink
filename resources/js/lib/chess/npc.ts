import type { AvatarLook } from "@/game/types";
import type { ChessDifficulty } from "@/types";

/** The NPC opponent at the Hotel chess boards (same name as config/chess.php). */
export const NPC_NAME = "BOT1";

/** The NPC's outfit, in the Hotel avatar style. */
export const NPC_LOOK: AvatarLook = {
    skin: "#E0AC7E",
    hair: "#1F1F2E",
    hairStyle: 2,
    shirt: "#7C5CFF",
    pants: "#0F1E3A",
    shoes: "#FFB627",
};

export const DIFFICULTY_LABELS: Record<ChessDifficulty, string> = {
    easy: "Makkelijk",
    normal: "Normaal",
    hard: "Moeilijk",
};
