import { useState, type FormEvent } from "react";
import { Head, router } from "@inertiajs/react";
import { AvatarEditor } from "@/components/hotel/HotelPanels";
import { AvatarPreview } from "@/components/hotel/AvatarPreview";
import { Button, Spinner } from "@/components/tribelink/button";
import { loadLook, LOOK_KEY } from "@/game/look";
import type { AvatarLook } from "@/game/types";
import { store } from "@/routes/hotel/avatar";

/**
 * "Maak je poppetje": direct na het registreren (en verifiëren) maak je je avatar,
 * daarna loop je meteen het Hotel in. Volledig scherm, net als het Hotel zelf (zie app.tsx).
 */
export default function Poppetje({ look: saved }: { look: AvatarLook | null }) {
    const [look, setLook] = useState<AvatarLook>(() => saved ?? loadLook());
    const [processing, setProcessing] = useState(false);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        try {
            localStorage.setItem(LOOK_KEY, JSON.stringify(look));
        } catch {
            /* geen opslag: de server bewaart hem ook */
        }
        router.post(
            store.url(),
            { look: { ...look } as Record<string, string | number> },
            {
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <>
            <Head title="Maak je poppetje" />
            <main className="flex min-h-dvh items-center justify-center bg-brand-gradient px-4 py-8">
                <form
                    onSubmit={submit}
                    className="flex w-full max-w-3xl flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card md:flex-row"
                >
                    <section className="flex flex-col items-center justify-center gap-4 bg-media-gradient px-6 py-8 md:w-1/2">
                        <AvatarPreview look={look} size={120} dir={2} waving />
                        <p className="text-center font-pixel text-[13px] uppercase tracking-wide text-white drop-shadow">
                            Zo kom je het Hotel binnen
                        </p>
                    </section>
                    <section className="flex flex-col gap-4 p-5 md:w-1/2 md:p-6">
                        <header className="flex flex-col gap-1">
                            <h1 className="font-display text-2xl font-bold text-ink">
                                Maak je poppetje
                            </h1>
                            <p className="text-[14px] text-ink-secondary">
                                Kies je kapsel en kleuren. Je kunt het later in
                                het Hotel altijd nog aanpassen.
                            </p>
                        </header>
                        <AvatarEditor look={look} onChange={setLook} />
                        <Button
                            type="submit"
                            size="lg"
                            fullWidth
                            disabled={processing}
                        >
                            {processing ? <Spinner /> : "Het Hotel in →"}
                        </Button>
                    </section>
                </form>
            </main>
        </>
    );
}
