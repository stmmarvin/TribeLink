import { useEffect, useRef } from "react";
import { drawAvatar } from "@/game/draw/avatar";
import type { AvatarLook, Dir } from "@/game/types";

type Props = {
    look: AvatarLook;
    size?: number;
    dir?: Dir;
    waving?: boolean;
    className?: string;
};

/** Statische avatar op een klein canvas (infostand, avatar-editor). Hergebruikt de tekenfunctie van de engine. */
export function AvatarPreview({
    look,
    size = 64,
    dir = 2,
    waving = false,
    className,
}: Props) {
    const ref = useRef<HTMLCanvasElement>(null);
    const height = size * 2;

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = height * dpr;
        const ctx = canvas.getContext("2d")!;
        const scale = size / 48;
        ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
        ctx.clearRect(0, 0, 48, height / scale);
        drawAvatar(ctx, 24, height / scale - 10, look, {
            dir,
            walkFrame: -1,
            sitting: false,
            waving,
            danceFrame: -1,
        });
    }, [look, size, height, dir, waving]);

    return (
        <canvas
            ref={ref}
            style={{ width: size, height }}
            className={className}
            aria-hidden
        />
    );
}
