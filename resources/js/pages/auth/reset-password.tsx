import { Form, Head } from "@inertiajs/react";
import { useState } from "react";
import { AuthPanel } from "@/components/tribelink/auth-panel";
import { Button, Spinner } from "@/components/tribelink/button";
import { TextField } from "@/components/tribelink/input";
import { validateConfirmation, validatePassword } from "@/lib/validation";
import { login } from "@/routes";
import { update } from "@/routes/password";

type Props = {
    token: string;
    email: string;
    passwordRules: string;
};

// Not in Figma: designed in the style of 1.5 "Wachtwoord vergeten".
export default function ResetPassword({ token, email, passwordRules }: Props) {
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [touched, setTouched] = useState({ password: false, confirm: false });

    const passwordError = touched.password
        ? validatePassword(password, passwordRules)
        : undefined;
    const confirmationError = touched.confirm
        ? validateConfirmation(password, confirmation)
        : undefined;

    return (
        <>
            <Head title="Nieuw wachtwoord" />

            <AuthPanel title="Nieuw wachtwoord" backHref={login()}>
                <p className="type-small text-ink-secondary">
                    Kies een nieuw wachtwoord voor je TribeLink-account.
                </p>
                <Form
                    {...update.form()}
                    transform={(data) => ({ ...data, token, email })}
                    resetOnSuccess={["password", "password_confirmation"]}
                    onBefore={() => {
                        setTouched({ password: true, confirm: true });

                        // Returning false cancels the request.
                        return !(
                            validatePassword(password, passwordRules) ||
                            validateConfirmation(password, confirmation)
                        );
                    }}
                    className="flex flex-1 flex-col gap-3.5 md:gap-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <TextField
                                id="email"
                                label="HU-mail"
                                type="email"
                                name="email"
                                autoComplete="email"
                                value={email}
                                readOnly
                                error={errors.email}
                            />
                            <TextField
                                id="password"
                                label="Nieuw wachtwoord"
                                type="password"
                                name="password"
                                autoComplete="new-password"
                                autoFocus
                                placeholder="Kies een sterk wachtwoord"
                                passwordrules={passwordRules}
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                onBlur={() =>
                                    setTouched((current) => ({
                                        ...current,
                                        password: true,
                                    }))
                                }
                                error={passwordError ?? errors.password}
                                dashedError={
                                    !passwordError && !!errors.password
                                }
                            />
                            <TextField
                                id="password_confirmation"
                                label="Wachtwoord bevestigen"
                                type="password"
                                name="password_confirmation"
                                autoComplete="new-password"
                                placeholder="Herhaal je wachtwoord"
                                passwordrules={passwordRules}
                                value={confirmation}
                                onChange={(event) =>
                                    setConfirmation(event.target.value)
                                }
                                onBlur={() =>
                                    setTouched((current) => ({
                                        ...current,
                                        confirm: true,
                                    }))
                                }
                                error={
                                    confirmationError ??
                                    errors.password_confirmation
                                }
                            />
                            <div className="flex-1 md:hidden" />
                            <Button
                                type="submit"
                                fullWidth
                                disabled={processing}
                                data-test="reset-password-button"
                            >
                                {processing && <Spinner />}
                                Wachtwoord opslaan
                            </Button>
                        </>
                    )}
                </Form>
            </AuthPanel>
        </>
    );
}
