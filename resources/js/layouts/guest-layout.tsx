import type { ReactNode } from "react";
import { ButtonLink } from "@/components/tribelink/button";
import { Navbar } from "@/components/tribelink/navbar";
import { login, register } from "@/routes";

export type GuestTopBar = "login" | "register" | "none";

/**
 * Layout for all guest/auth screens. Desktop (md+) shows the Figma top bar
 * with a context action; mobile follows the Figma mobile frames, which have
 * no top bar (each screen has its own back header instead).
 */
export default function GuestLayout({
    topBar = "none",
    children,
}: {
    topBar?: GuestTopBar;
    children: ReactNode;
}) {
    return (
        <div className="flex min-h-dvh flex-col bg-app font-body text-ink scheme-light">
            <Navbar
                className="hidden md:block"
                actions={
                    topBar === "login" ? (
                        <>
                            <span className="type-small text-ink-secondary">
                                Al een account?
                            </span>
                            <ButtonLink
                                href={login()}
                                variant="secondary"
                                size="md"
                                className="w-[120px]"
                            >
                                Inloggen
                            </ButtonLink>
                        </>
                    ) : topBar === "register" ? (
                        <>
                            <span className="type-small text-ink-secondary">
                                Nog geen account?
                            </span>
                            <ButtonLink
                                href={register()}
                                variant="secondary"
                                size="md"
                                className="w-[120px]"
                            >
                                Registreren
                            </ButtonLink>
                        </>
                    ) : undefined
                }
            />
            <main className="flex flex-1 flex-col">{children}</main>
        </div>
    );
}
