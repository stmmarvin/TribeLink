import { useEffect, useRef, useState } from "react";

type CountdownProps = {
    /** Read out to screen readers before the digit ("De partij begint over 2"). */
    label: string;
    onDone: () => void;
} & (
    | {
          /**
           * Count to the server's `startsAt`, corrected for the difference
           * between the server clock and this browser's, so two players see
           * the same number at the same time (chess).
           */
          startsAt: string;
          serverNow: string;
          seconds?: never;
      }
    | {
          /** Count down this many seconds from now (single player games). */
          seconds: number;
          startsAt?: never;
          serverNow?: never;
      }
);

/**
 * Big pixel countdown 3 → 2 → 1 → 0 before a game, over its (relative)
 * parent: the Hotel or the game area, not the whole page.
 */
export function Countdown({
    label,
    onDone,
    startsAt,
    serverNow,
    seconds,
}: CountdownProps) {
    // When the countdown ends, in this browser's clock; fixed for one countdown
    const [endsAt] = useState(() =>
        startsAt !== undefined
            ? Date.parse(startsAt) - (Date.parse(serverNow) - Date.now())
            : Date.now() + seconds * 1000,
    );
    const remaining = () => endsAt - Date.now();
    const [left, setLeft] = useState(remaining);
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;

    useEffect(() => {
        let raf = 0;
        const tick = () => {
            const ms = remaining();
            setLeft(ms);

            if (ms <= 0) {
                onDoneRef.current();

                return;
            }

            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(raf);
    }, [endsAt]);

    if (left <= 0) {
        return null;
    }

    const digit = Math.max(0, Math.ceil(left / 1000) - 1);

    return (
        <div
            role="timer"
            aria-live="assertive"
            aria-label={`${label} ${digit}`}
            className="pointer-events-none absolute inset-0 z-[90] flex items-center justify-center bg-ink/55"
        >
            {/* key: every new digit restarts its animation */}
            <div
                key={digit}
                className="relative flex items-center justify-center"
            >
                <span className="absolute size-56 animate-game-count-ring border-8 border-cyan sm:size-72" />
                <span className="animate-game-count font-pixel text-[160px] leading-none font-bold text-white [text-shadow:8px_8px_0_#2f6bff,16px_16px_0_rgb(15_30_58/0.6)] sm:text-[220px]">
                    {digit}
                </span>
            </div>
            <p className="absolute bottom-[18%] font-pixel text-[14px] tracking-widest text-white/85 uppercase sm:text-[18px]">
                {digit === 0 ? "Speel!" : ""}
            </p>
        </div>
    );
}
