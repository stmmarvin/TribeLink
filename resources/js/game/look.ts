import { randomLook } from "./rooms";
import type { AvatarLook } from "./types";

/** localStorage-sleutel van de outfit die je in het Hotel kiest. */
export const LOOK_KEY = "tribelink.hotel.look";

/** Outfit voor iemand die nog nooit in het Hotel was (spelerskaart bij schaken, kaarttafel). */
export const DEFAULT_LOOK: AvatarLook = {
    skin: "#F1C7A5",
    hair: "#5A3A1E",
    hairStyle: 0,
    shirt: "#2F6BFF",
    pants: "#3B4A68",
    shoes: "#FFFFFF",
};

/** Je opgeslagen Hotel-outfit, of een nieuwe willekeurige als er (nog) geen is. */
export function loadLook(): AvatarLook {
    try {
        const saved = localStorage.getItem(LOOK_KEY);
        if (saved) return JSON.parse(saved) as AvatarLook;
    } catch {
        /* private modus / geblokkeerde opslag → gewoon een nieuwe look */
    }
    return randomLook();
}
