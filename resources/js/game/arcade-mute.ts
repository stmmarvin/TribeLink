/**
 * Geluid aan/uit voor alle arcadespellen samen (Stack, Wave Rush, …), per
 * browser onthouden. Standaard staat het geluid aan, maar zacht.
 */
const MUTE_KEY = "tribelink:arcade-muted";

export function loadMuted(): boolean {
    try {
        return localStorage.getItem(MUTE_KEY) === "1";
    } catch {
        return false;
    }
}

export function saveMuted(muted: boolean) {
    try {
        localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
        /* zonder storage: alleen voor deze sessie */
    }
}
