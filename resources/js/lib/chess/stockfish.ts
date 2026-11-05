import { Chess } from "chess.js";
import engineUrl from "stockfish/bin/stockfish-19-lite-single.js?url";
import wasmUrl from "stockfish/bin/stockfish-19-lite-single.wasm?url";
import type { ChessDifficulty } from "@/types";

/** Stockfish strength per difficulty: Skill Level (0–20) and search. */
const STRENGTH: Record<ChessDifficulty, { skill: number; go: string }> = {
    easy: { skill: 0, go: "go depth 1" },
    normal: { skill: 6, go: "go depth 6" },
    hard: { skill: 16, go: "go movetime 900" },
};

/** Without an answer in this time we fall back to a random legal move. */
const TIMEOUT_MS = 6000;

let worker: Worker | null = null;
let failed = false;

/**
 * The single-threaded "lite" Stockfish (WASM) in a web worker. It needs no
 * cross-origin isolation headers, so it works on any server. The worker is
 * started from a small blob script so it also loads from the Vite dev server
 * (another origin); the `#…` part tells the engine where its .wasm file is.
 */
function engine(): Worker | null {
    if (worker || failed) {
        return worker;
    }

    try {
        const absolute = (url: string) =>
            new URL(url, window.location.href).href;
        const boot = URL.createObjectURL(
            new Blob(
                [`importScripts(${JSON.stringify(absolute(engineUrl))});`],
                {
                    type: "text/javascript",
                },
            ),
        );
        worker = new Worker(`${boot}#${encodeURIComponent(absolute(wasmUrl))}`);
        worker.addEventListener("error", () => {
            failed = true;
            worker?.terminate();
            worker = null;
        });
        worker.postMessage("uci");
    } catch {
        failed = true;
        worker = null;
    }

    return worker;
}

function randomMove(fen: string): string {
    const moves = new Chess(fen).moves({ verbose: true });
    const move = moves[Math.floor(Math.random() * moves.length)];

    return move.from + move.to + (move.promotion ?? "");
}

/** One search at a time, so a late `bestmove` never answers a newer question. */
let queue: Promise<unknown> = Promise.resolve();

/** The NPC's move for this position, in UCI notation (`e7e5`, `a2a1q`). */
export function npcMove(
    fen: string,
    difficulty: ChessDifficulty,
): Promise<string> {
    const next = queue.then(() => search(fen, difficulty));
    queue = next;

    return next;
}

function search(fen: string, difficulty: ChessDifficulty): Promise<string> {
    const sf = engine();

    if (!sf) {
        return Promise.resolve(randomMove(fen));
    }

    return new Promise((resolve) => {
        const finish = (move: string) => {
            window.clearTimeout(timer);
            sf.removeEventListener("message", onMessage);
            resolve(move);
        };
        const onMessage = (event: MessageEvent) => {
            const match = /^bestmove (\S+)/.exec(String(event.data));

            if (match) {
                finish(match[1] === "(none)" ? randomMove(fen) : match[1]);
            }
        };
        const timer = window.setTimeout(() => {
            sf.postMessage("stop");
            finish(randomMove(fen));
        }, TIMEOUT_MS);

        sf.addEventListener("message", onMessage);
        sf.postMessage(
            `setoption name Skill Level value ${STRENGTH[difficulty].skill}`,
        );
        sf.postMessage(`position fen ${fen}`);
        sf.postMessage(STRENGTH[difficulty].go);
    });
}
