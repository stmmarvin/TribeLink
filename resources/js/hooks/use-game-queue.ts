import { useEffect, useRef, useState } from "react";
import { deleteJson, postJson } from "@/lib/http";

/** How often the queue is polled while you wait at a table. */
const POLL_MS = 1000;

/** The states every game queue has (App\Games\Matchmaking). */
type QueueState =
    | { status: "idle" }
    | { status: "searching" }
    | { status: "matched"; gameId: number };

/** The queue endpoints of one game (`search`, `queue`, `cancel`). */
export type QueueRoutes = {
    search: { url: () => string };
    queue: { url: () => string };
    cancel: { url: () => string };
};

/**
 * Waiting at a game table in the Hotel (chess board, card table): `join`
 * puts you in the queue, then the server is polled every second until it
 * started a game for you. Leaving the page while waiting gives up your
 * spot. `send` posts another queue action (e.g. "Nu starten") and takes
 * its answer as the new state.
 */
export function useGameQueue<S extends QueueState>(
    routes: QueueRoutes,
    onMatched: (match: Extract<S, { status: "matched" }>) => void,
) {
    const [state, setState] = useState<S>({ status: "idle" } as S);
    const [error, setError] = useState(false);
    const onMatchedRef = useRef(onMatched);
    onMatchedRef.current = onMatched;
    const searchingRef = useRef(false);
    searchingRef.current = state.status === "searching";

    useEffect(() => {
        if (state.status === "matched") {
            onMatchedRef.current(state as Extract<S, { status: "matched" }>);
        }

        if (state.status !== "searching") {
            return;
        }

        let stopped = false;
        const timer = window.setTimeout(async () => {
            try {
                const next = await postJson<S>(routes.queue.url(), {});

                if (!stopped) {
                    setState(next);
                }
            } catch {
                // Network hiccup: poll again with a fresh copy of the same state
                if (!stopped) {
                    setState((current) => ({ ...current }));
                }
            }
        }, POLL_MS);

        return () => {
            stopped = true;
            window.clearTimeout(timer);
        };
    }, [state]);

    // Navigating away while waiting: leave the queue
    useEffect(
        () => () => {
            if (searchingRef.current) {
                void deleteJson(routes.cancel.url()).catch(() => {});
            }
        },
        [],
    );

    const send = async (url: string, body: Record<string, unknown>) => {
        setError(false);

        try {
            setState(await postJson<S>(url, body));
        } catch {
            setError(true);
        }
    };

    const join = (body: Record<string, unknown>) =>
        send(routes.search.url(), body);

    const leave = () => {
        setState({ status: "idle" } as S);
        void deleteJson(routes.cancel.url()).catch(() => {});
    };

    return { state, error, join, send, leave };
}
