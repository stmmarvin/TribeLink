import { Head, usePage } from "@inertiajs/react";
import landingHero from "../../images/landing-hero.webp";
import { HotelPreview } from "@/components/hotel/HotelPreview";
import { ButtonLink } from "@/components/tribelink/button";
import { Navbar } from "@/components/tribelink/navbar";
import { cn } from "@/lib/utils";
import { dashboard, login, register } from "@/routes";

/** Same width and side padding as the navbar, so every section lines up. */
const container = "mx-auto w-full max-w-[1440px] px-5 md:px-10 xl:px-[120px]";

function Cta({
    loggedIn,
    className,
}: {
    loggedIn: boolean;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-col gap-3 sm:flex-row", className)}>
            {loggedIn ? (
                <ButtonLink href={dashboard()} className="sm:w-[200px]">
                    Naar de app
                </ButtonLink>
            ) : (
                <>
                    <ButtonLink href={register()} className="sm:w-[200px]">
                        Registreren
                    </ButtonLink>
                    <ButtonLink
                        href={login()}
                        variant="secondary"
                        className="sm:w-[200px]"
                    >
                        Inloggen
                    </ButtonLink>
                </>
            )}
        </div>
    );
}

export default function Welcome() {
    const { auth } = usePage().props;
    const loggedIn = !!auth.user;

    return (
        <>
            <Head title="Ontmoet andere HU-studenten" />
            <div className="flex min-h-dvh flex-col bg-app font-body text-ink scheme-light">
                <Navbar
                    className="sticky top-0 z-40 bg-app/85 backdrop-blur"
                    actions={
                        loggedIn ? (
                            <ButtonLink href={dashboard()} size="md">
                                Naar de app
                            </ButtonLink>
                        ) : (
                            <>
                                <ButtonLink
                                    href={login()}
                                    variant="secondary"
                                    size="md"
                                    className="w-[120px]"
                                >
                                    Inloggen
                                </ButtonLink>
                                <ButtonLink
                                    href={register()}
                                    size="md"
                                    className="w-[140px]"
                                >
                                    Registreren
                                </ButtonLink>
                            </>
                        )
                    }
                    mobileMenu={
                        loggedIn ? (
                            <ButtonLink href={dashboard()} fullWidth>
                                Naar de app
                            </ButtonLink>
                        ) : (
                            <>
                                <ButtonLink href={register()} fullWidth>
                                    Registreren
                                </ButtonLink>
                                <ButtonLink
                                    href={login()}
                                    variant="secondary"
                                    fullWidth
                                >
                                    Inloggen
                                </ButtonLink>
                            </>
                        )
                    }
                />

                <main className="flex flex-1 flex-col">
                    {/* Hero: pitch left, live hotel preview right */}
                    <section
                        aria-labelledby="hero-title"
                        className={cn(
                            container,
                            "grid items-center gap-10 py-10 md:py-16 lg:min-h-[calc(100dvh-72px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,576px)] lg:gap-16 lg:py-12",
                        )}
                    >
                        <div className="flex flex-col items-start gap-6">
                            <h1
                                id="hero-title"
                                className="font-display text-[36px] leading-[1.15] font-extrabold tracking-tight text-ink md:text-[48px] md:leading-[1.1] xl:text-[56px]"
                            >
                                Ontmoet andere
                                <br></br>HU-studenten .
                            </h1>
                            <p className="max-w-[480px] type-body text-ink-secondary md:text-lg">
                                Leer medestudenten kennen! Vind je het lastig om
                                zomaar iemand aan te spreken? Op TribeLink begin
                                je anoniem met een chat, een brief of in het
                                hotel, en spreek je pas af als het klikt.
                            </p>
                            <Cta
                                loggedIn={loggedIn}
                                className="w-full sm:w-auto"
                            />
                            <p className="type-caption text-ink-muted">
                                Log in met je @student.hu.nl-adres
                            </p>
                        </div>

                        {/* Hotel preview: animated, not playable */}
                        <div className="relative mx-auto w-full max-w-[576px]">
                            <div
                                aria-hidden="true"
                                className="absolute -inset-6 rounded-[40px] bg-brand-gradient opacity-20 blur-3xl"
                            />
                            <HotelPreview className="relative aspect-[576/520] w-full rounded-panel shadow-illustration ring-1 ring-white/60" />
                        </div>
                    </section>

                    {/* Ways to meet: illustration */}
                    <section
                        aria-labelledby="moments-title"
                        className={cn(
                            container,
                            "flex flex-col items-center gap-4 pb-16 text-center md:gap-5 md:pb-24",
                        )}
                    >
                        <p className="type-label text-brand-aa">
                            Chat · Hotel · Poster
                        </p>
                        <h2
                            id="moments-title"
                            className="max-w-[640px] type-h2 text-ink md:text-[36px] md:leading-[1.2]"
                        >
                            Van een anoniem berichtje naar{" "}
                            <span className="text-brand-gradient">
                                echte vrienden
                            </span>
                            .
                        </h2>
                        <p className="max-w-[528px] type-body text-ink-secondary">
                            Jij kiest hoe je iemand leert kennen: een gesprek,
                            een brief, samen rondlopen in het hotel of een
                            poster op de campus.
                        </p>
                        <img
                            src={landingHero}
                            alt="Pixelpoppetjes die elkaar ontmoeten: samen lunchen, een brief geven, schaken in het hotel en zwaaien bij een poster met QR-code."
                            width={1536}
                            height={1024}
                            loading="lazy"
                            decoding="async"
                            className="mt-4 w-full max-w-[1100px] [mask-image:radial-gradient(ellipse_at_center,black_78%,transparent_100%)]"
                        />
                    </section>
                </main>
            </div>
        </>
    );
}
