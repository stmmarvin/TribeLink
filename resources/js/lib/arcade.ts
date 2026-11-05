import type { TransitionKind } from "@/components/games/transition";

/** Een speelbare kast in de Arcade (resources/js/game/rooms.ts) en het spel erop (config/arcade.php). */
export type ArcadeCabinet = {
    /** Spel-id voor de routes en arcade_scores. */
    game: string;
    title: string;
    /** Uitleg in de popup bij de kast. */
    description: string;
    /** Furni-id van de kast: daar zoomt de camera op in (en bij terugkomen weer van uit). */
    cabinet: string;
    /** Overgang tussen hotel en spel. */
    transition: TransitionKind;
};

const STACK: ArcadeCabinet = {
    game: "stack",
    title: "Stack",
    description:
        "Stapel de blokken zo hoog mogelijk. Klik, tik of druk op spatie om te laten vallen.",
    cabinet: "stack-1",
    transition: "pixel",
};

const WAVE_RUSH: ArcadeCabinet = {
    game: "wave-rush",
    title: "Wave Rush",
    description:
        "Scheur op je jetski over de golven. Ontwijk boeien en rotsen, pak munten en boosts.",
    cabinet: "waverush-1",
    transition: "wave",
};

/** Furni-id → kast. De jetski voor de Wave Rush-kast hoort bij dezelfde kast. */
export const CABINETS: Record<string, ArcadeCabinet> = {
    "stack-1": STACK,
    "waverush-1": WAVE_RUSH,
    "waverush-jetski": WAVE_RUSH,
};

/**
 * Terug uit een arcadespel: het hotel begint dan ingezoomd op de kast waar je
 * speelde en zoomt uit (de omgekeerde overgang van het instappen).
 */
const RETURN_KEY = "tribelink:arcade-return";

export function markArcadeReturn(furniId: string) {
    try {
        sessionStorage.setItem(RETURN_KEY, furniId);
    } catch {
        /* zonder storage: het hotel verschijnt gewoon zonder uitzoomen */
    }
}

/** De kast om vanaf uit te zoomen (eenmalig), of null. */
export function takeArcadeReturn(): string | null {
    try {
        const id = sessionStorage.getItem(RETURN_KEY);
        sessionStorage.removeItem(RETURN_KEY);

        return id;
    } catch {
        return null;
    }
}
