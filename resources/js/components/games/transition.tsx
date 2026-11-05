import { useEffect, useState } from "react";
import { PixelTransition } from "./pixel-transition";
import { WaveTransition } from "./wave-transition";

/** Pixel dissolve (chess, Stack) or a washing wave (Wave Rush). */
export type TransitionKind = "pixel" | "wave";

/** Set before a page visit, so the next page plays the same transition in reverse. */
const STORAGE_KEY = "tribelink:game-transition";

export function markTransition(kind: TransitionKind = "pixel") {
    try {
        sessionStorage.setItem(STORAGE_KEY, kind);
    } catch {
        /* zonder storage: de volgende pagina verschijnt gewoon direct */
    }
}

function marked(): TransitionKind | null {
    try {
        const kind = sessionStorage.getItem(STORAGE_KEY);

        return kind === "pixel" || kind === "wave" ? kind : null;
    } catch {
        return null;
    }
}

/**
 * On the page after a transition: `[kind, done]` until the reveal has
 * played, then `[null, done]`. The mark is only cleared in an effect, so the
 * first render already shows the covered screen.
 */
export function useTransitionReveal() {
    const [reveal, setReveal] = useState(marked);

    useEffect(() => {
        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch {
            /* negeren */
        }
    }, []);

    return [reveal, () => setReveal(null)] as const;
}

/** The transition of the given kind over its (relative) parent. */
export function GameTransition({
    kind,
    mode,
    onDone,
}: {
    kind: TransitionKind;
    mode: "cover" | "reveal";
    onDone?: () => void;
}) {
    return kind === "wave" ? (
        <WaveTransition mode={mode} onDone={onDone} />
    ) : (
        <PixelTransition mode={mode} onDone={onDone} />
    );
}
