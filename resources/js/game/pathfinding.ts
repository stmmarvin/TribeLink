import type { Tile } from "./types";

export function findPath(
    start: Tile,
    goal: Tile,
    canStep: (from: Tile, to: Tile) => boolean,
    maxNodes = 2000,
): Tile[] {
    if (start.x === goal.x && start.y === goal.y) return [];
    const key = (t: Tile) => `${t.x},${t.y}`;
    // Octile-afstand: recht = 1, diagonaal = √2
    const h = (t: Tile) => {
        const dx = Math.abs(t.x - goal.x);
        const dy = Math.abs(t.y - goal.y);
        return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    };

    const open: Array<Tile & { f: number }> = [{ ...start, f: h(start) }];
    const g = new Map<string, number>([[key(start), 0]]);
    const cameFrom = new Map<string, Tile>();
    const closed = new Set<string>();

    while (open.length && closed.size < maxNodes) {
        // Kleine kamers → een lineaire zoektocht naar de laagste f is snel genoeg.
        let best = 0;
        for (let i = 1; i < open.length; i++)
            if (open[i].f < open[best].f) best = i;
        const cur = open.splice(best, 1)[0];
        const ck = key(cur);
        if (cur.x === goal.x && cur.y === goal.y) {
            const path: Tile[] = [];
            let t: Tile | undefined = cur;
            while (t && key(t) !== key(start)) {
                path.unshift({ x: t.x, y: t.y });
                t = cameFrom.get(key(t));
            }
            return path;
        }
        closed.add(ck);

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (!dx && !dy) continue;
                const nb = { x: cur.x + dx, y: cur.y + dy };
                const nk = key(nb);
                if (closed.has(nk) || !canStep(cur, nb)) continue;
                if (
                    dx &&
                    dy &&
                    (!canStep(cur, { x: cur.x + dx, y: cur.y }) ||
                        !canStep(cur, { x: cur.x, y: cur.y + dy }))
                )
                    continue;
                const cost = (g.get(ck) ?? 0) + (dx && dy ? Math.SQRT2 : 1);
                if (cost >= (g.get(nk) ?? Infinity)) continue;
                g.set(nk, cost);
                cameFrom.set(nk, cur);
                const existing = open.find((o) => o.x === nb.x && o.y === nb.y);
                if (existing) existing.f = cost + h(nb);
                else open.push({ ...nb, f: cost + h(nb) });
            }
        }
    }
    return [];
}
