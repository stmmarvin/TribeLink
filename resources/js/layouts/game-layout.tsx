import type { ReactNode } from "react";

/**
 * Full screen for the games in the Hotel (schaken, Tribekaarten, arcade):
 * no sidebar or bottom tab bar, just the page's own game bar and the game.
 */
export default function GameLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-dvh bg-app font-body text-ink scheme-light">
            {children}
        </div>
    );
}
