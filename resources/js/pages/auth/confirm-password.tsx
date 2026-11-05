import { Form, Head } from "@inertiajs/react";
import {
    index as confirmOptions,
    store as confirmStore,
} from "@/actions/Laravel/Passkeys/Http/Controllers/PasskeyConfirmationController";
import { AuthPanel } from "@/components/tribelink/auth-panel";
import { Button, Spinner } from "@/components/tribelink/button";
import { TextField } from "@/components/tribelink/input";
import { PasskeyButton } from "@/components/tribelink/passkey-button";
import { store } from "@/routes/password/confirm";

// Not in Figma: designed in the style of 1.4 "Inloggen".
export default function ConfirmPassword() {
    return (
        <>
            <Head title="Wachtwoord bevestigen" />

            <AuthPanel title="Wachtwoord bevestigen">
                <p className="type-small text-ink-secondary">
                    Dit is een beveiligd deel van TribeLink. Bevestig je
                    wachtwoord om door te gaan.
                </p>

                <PasskeyButton
                    routes={{
                        options: confirmOptions(),
                        submit: confirmStore(),
                    }}
                    label="Bevestigen met een passkey"
                    loadingLabel="Bezig met bevestigen…"
                    separator="of bevestig met je wachtwoord"
                />

                <Form
                    {...store.form()}
                    resetOnSuccess={["password"]}
                    className="flex flex-1 flex-col gap-3.5 md:gap-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <TextField
                                id="password"
                                label="Wachtwoord"
                                type="password"
                                name="password"
                                autoComplete="current-password"
                                autoFocus
                                placeholder="Je wachtwoord"
                                error={errors.password}
                            />
                            <div className="flex-1 md:hidden" />
                            <Button
                                type="submit"
                                fullWidth
                                disabled={processing}
                                data-test="confirm-password-button"
                            >
                                {processing && <Spinner />}
                                Bevestigen
                            </Button>
                        </>
                    )}
                </Form>
            </AuthPanel>
        </>
    );
}
