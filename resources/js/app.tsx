import { createInertiaApp } from "@inertiajs/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initializeTheme } from "@/hooks/use-appearance";
import AppLayout from "@/layouts/app-layout";
import GameLayout from "@/layouts/game-layout";
import GuestLayout from "@/layouts/guest-layout";
import SettingsLayout from "@/layouts/settings/layout";

const appName = import.meta.env.VITE_APP_NAME || "TribeLink";

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === "welcome":
                return null;
            // The Hotel fills the whole screen (it has its own "Verlaten" button)
            case name === "ontmoeten/lobby":
            case name === "ontmoeten/poppetje":
                return null;
            // The games in the Hotel are full screen too, like the Hotel itself
            case [
                "ontmoeten/schaken",
                "ontmoeten/tribekaarten",
                "ontmoeten/wave-rush",
                "ontmoeten/stack",
            ].includes(name):
                return GameLayout;
            case name.startsWith("auth/"):
                return GuestLayout;
            // "Profiel bewerken" is a full TribeLink screen, not a settings tab.
            case name === "settings/profile":
                return AppLayout;
            case name.startsWith("settings/"):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: "var(--color-brand)",
    },
});

// This will set light / dark mode on load...
initializeTheme();
