import { Form, Head } from "@inertiajs/react";
import { AuthPanel } from "@/components/tribelink/auth-panel";
import { Button, ButtonLink, Spinner } from "@/components/tribelink/button";
import { icons } from "@/components/tribelink/icons";
import { TextField } from "@/components/tribelink/input";
import { login } from "@/routes";
import { email } from "@/routes/password";

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Wachtwoord vergeten" />

            <AuthPanel title="Wachtwoord vergeten" backHref={login()}>
                {status ? (
                    // Figma 1.5b – "Resetlink verstuurd"
                    <div className="flex flex-1 flex-col gap-5">
                        <div
                            role="status"
                            className="flex flex-1 flex-col items-center justify-center gap-3 text-center md:flex-none"
                        >
                            <span className="flex size-[72px] items-center justify-center rounded-full bg-brand/10">
                                <img
                                    src={icons.mail}
                                    alt=""
                                    width={53.3333}
                                    height={53.3333}
                                />
                            </span>
                            <h2 className="font-display text-base leading-[21px] font-bold text-ink">
                                Resetlink verstuurd
                            </h2>
                            <p className="type-small text-ink-secondary">
                                Hoort er een account bij dit adres? Dan ontvang
                                je binnen een paar minuten een link. Kijk ook in
                                je spam.
                            </p>
                        </div>
                        <ButtonLink href={login()} fullWidth>
                            Terug naar inloggen
                        </ButtonLink>
                    </div>
                ) : (
                    <>
                        <p className="type-small text-ink-secondary">
                            Vul je HU-mail in. We sturen je een link om een
                            nieuw wachtwoord te kiezen.
                        </p>
                        <Form
                            {...email.form()}
                            className="flex flex-1 flex-col gap-3.5 md:gap-5"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <TextField
                                        id="email"
                                        label="HU-mail"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        autoComplete="email"
                                        placeholder="naam@student.hu.nl"
                                        error={errors.email}
                                    />
                                    <div className="flex-1 md:hidden" />
                                    <Button
                                        type="submit"
                                        fullWidth
                                        disabled={processing}
                                        data-test="email-password-reset-link-button"
                                    >
                                        {processing && <Spinner />}
                                        Stuur resetlink
                                    </Button>
                                </>
                            )}
                        </Form>
                    </>
                )}
            </AuthPanel>
        </>
    );
}
