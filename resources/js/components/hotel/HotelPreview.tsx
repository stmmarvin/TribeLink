import { useEffect, useRef } from "react";
import { HotelEngine } from "@/game/engine";
import { getRoomDef, randomLook } from "@/game/rooms";
import { cn } from "@/lib/utils";

/** Extra poppetjes in de preview (bedachte namen, geen echte gebruikers). */
const FIGURANTS = ["Sam", "Noor", "Daan", "Lotte"];

/**
 * Niet-speelbare hotelkamer voor de welkomstpagina: dezelfde engine, maar
 * zonder klikken, knoppen of chat. De poppetjes lopen, zitten, zwaaien en dansen vanzelf.
 */
export function HotelPreview({
    roomId = "kantine",
    className,
}: {
    roomId?: string;
    className?: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const engine = new HotelEngine(
            canvasRef.current!,
            {},
            { preview: true },
        );
        engine.loadRoom(getRoomDef(roomId), {
            name: "Jij",
            motto: "",
            look: randomLook(),
        });
        const ids = [
            "me",
            ...FIGURANTS.map((name) =>
                engine.addFigurant(name, randomLook()),
            ).filter((id): id is string => !!id),
        ];

        // Bij "minder beweging" blijven de poppetjes staan; de kamer is dan een stilstaand plaatje
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
            return () => engine.destroy();

        const timers = new Set<number>();
        const later = (fn: () => void, ms: number) => {
            const t = window.setTimeout(() => {
                timers.delete(t);
                fn();
            }, ms);
            timers.add(t);
        };

        // Elk poppetje heeft zijn eigen ritme, zodat ze niet allemaal tegelijk iets doen
        const act = (id: string) => {
            const r = Math.random();
            if (r < 0.7) engine.wander(id);
            else if (r < 0.85) engine.waveAs(id);
            else {
                engine.danceAs(id);
                later(() => engine.danceAs(id), 2500);
            }
            later(() => act(id), 3500 + Math.random() * 4000);
        };
        ids.forEach((id, i) =>
            later(() => act(id), 1500 + i * 900 + Math.random() * 1000),
        );

        return () => {
            timers.forEach((t) => window.clearTimeout(t));
            engine.destroy();
        };
    }, [roomId]);

    return (
        <div className={cn("relative overflow-hidden", className)}>
            <canvas
                ref={canvasRef}
                className="pointer-events-none absolute inset-0 block"
                aria-hidden
            />
        </div>
    );
}
