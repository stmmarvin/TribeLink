import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/components/games/pixel-transition";
import { LogoMark } from "@/components/tribelink/logo";

/** Zo lang staat het laadscherm er minstens (anders flitst het alleen). */
const MIN_MS = 1800;
const REDUCED_MIN_MS = 400;
/** Nooit langer wachten dan dit, ook als de server traag is. */
const MAX_MS = 6000;

/**
 * Laadscherm als je het Hotel binnenkomt: één effen kleur met in het midden
 * het TribeLink-logo en een laadbalk.
 * Wacht tot `ready` (eerste sync met de server en de fonts) en minstens MIN_MS,
 * en roept dan `onDone` aan; de pagina laat het hotel daarna met de
 * pixel-dissolve over het hele scherm verschijnen.
 */
export function HotelLoader({
    ready,
    onDone,
}: {
    ready: boolean;
    onDone: () => void;
}) {
    const [start] = useState(() => performance.now());
    const [minMs] = useState(() =>
        prefersReducedMotion() ? REDUCED_MIN_MS : MIN_MS,
    );
    const [progress, setProgress] = useState(0);
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;
    const readyRef = useRef(ready);
    readyRef.current = ready;

    useEffect(() => {
        let done = false;
        const timer = window.setInterval(() => {
            const elapsed = performance.now() - start;
            const finished =
                (readyRef.current && elapsed >= minMs) || elapsed >= MAX_MS;
            // Tot 90% op de klok, de laatste 10% pas als alles er is
            setProgress(finished ? 1 : Math.min(0.9, (elapsed / minMs) * 0.9));
            if (finished && !done) {
                done = true;
                window.setTimeout(() => onDoneRef.current(), 250);
            }
        }, 50);

        return () => window.clearInterval(timer);
    }, [start, minMs]);

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label={`Hotel laden: ${Math.round(progress * 100)}%`}
            className="absolute inset-0 z-[110] flex items-center justify-center overflow-hidden bg-[#E6F0FF] px-6"
        >
            <div className="flex flex-col items-center gap-5">
                <div className="flex items-center gap-3 sm:gap-4">
                    <LogoMark size="lg" className="size-12 sm:size-16" />
                    <h1 className="type-logo text-[34px] leading-none text-ink sm:text-[52px]">
                        Tribe
                        <span className="bg-brand-gradient bg-clip-text text-transparent">
                            Link
                        </span>
                    </h1>
                </div>

                <div
                    aria-hidden
                    className="h-5 w-[min(80vw,420px)] overflow-hidden rounded-pill border-[3px] border-ink bg-white shadow-card"
                >
                    <div
                        className="h-full rounded-pill bg-sunshine transition-[width] duration-100 ease-linear"
                        style={{ width: `${progress * 100}%` }}
                    />
                </div>

                <p className="font-pixel text-[13px] text-ink uppercase">
                    Hotel laden…
                </p>
            </div>
        </div>
    );
}
