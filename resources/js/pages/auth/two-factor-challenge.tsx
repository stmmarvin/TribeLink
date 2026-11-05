import { Form, Head } from "@inertiajs/react";
import { useState } from "react";
import { AuthPanel } from "@/components/tribelink/auth-panel";
import { Button, Spinner } from "@/components/tribelink/button";
import { CodeInput } from "@/components/tribelink/code-input";
import { FieldError, TextField } from "@/components/tribelink/input";
import { OTP_MAX_LENGTH } from "@/hooks/use-two-factor-auth";
import { login } from "@/routes";
import { store } from "@/routes/two-factor/login";

// Not in Figma: uses the 6-box code input of 1.3 "E-mail verifiëren".
export default function TwoFactorChallenge() {
    const [showRecoveryInput, setShowRecoveryInput] = useState(false);
    const [code, setCode] = useState("");

    const toggleRecoveryMode = (clearErrors: () => void): void => {
        setShowRecoveryInput(!showRecoveryInput);
        clearErrors();
        setCode("");
    };

    return (
        <>
            <Head title="Tweestapsverificatie" />

            <AuthPanel
                title={showRecoveryInput ? "Herstelcode" : "Verificatiecode"}
                backHref={login()}
            >
                <p className="type-small text-ink-secondary">
                    {showRecoveryInput
                        ? "Bevestig de toegang tot je account met een van je herstelcodes."
                        : "Vul de code van 6 cijfers uit je authenticator-app in."}
                </p>

                <Form
                    {...store.form()}
                    resetOnError
                    resetOnSuccess={!showRecoveryInput}
                    className="flex flex-1 flex-col gap-3.5 md:gap-5"
                >
                    {({ errors, processing, clearErrors }) => (
                        <>
                            {showRecoveryInput ? (
                                <TextField
                                    id="recovery_code"
                                    name="recovery_code"
                                    label="Herstelcode"
                                    type="text"
                                    autoFocus
                                    required
                                    autoComplete="one-time-code"
                                    placeholder="Bijv. abcd-efgh"
                                    error={errors.recovery_code}
                                />
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    <CodeInput
                                        id="code"
                                        name="code"
                                        label="Verificatiecode"
                                        length={OTP_MAX_LENGTH}
                                        value={code}
                                        onChange={setCode}
                                        disabled={processing}
                                        autoFocus
                                        error={!!errors.code}
                                    />
                                    <FieldError message={errors.code} />
                                </div>
                            )}

                            <div className="flex-1 md:hidden" />

                            <Button
                                type="submit"
                                fullWidth
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                Bevestigen
                            </Button>

                            <p className="text-center type-caption text-ink-secondary">
                                Of{" "}
                                <button
                                    type="button"
                                    className="cursor-pointer rounded-sm font-display font-bold text-ink underline underline-offset-2 focus-ring hover:text-brand-aa"
                                    onClick={() =>
                                        toggleRecoveryMode(clearErrors)
                                    }
                                >
                                    {showRecoveryInput
                                        ? "log in met een verificatiecode"
                                        : "log in met een herstelcode"}
                                </button>
                            </p>
                        </>
                    )}
                </Form>
            </AuthPanel>
        </>
    );
}
