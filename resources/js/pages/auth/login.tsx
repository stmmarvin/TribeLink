import { Form, Head, Link } from "@inertiajs/react";
import {
    AuthFooterText,
    AuthPanel,
    authLinkClasses,
} from "@/components/tribelink/auth-panel";
import { Button, Spinner } from "@/components/tribelink/button";
import { Checkbox, TextField } from "@/components/tribelink/input";
import { StatusMessage } from "@/components/tribelink/status-message";
import { home, register } from "@/routes";
import { store } from "@/routes/login";
import { request } from "@/routes/password";

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Inloggen" />

            <AuthPanel title="Inloggen" backHref={home()}>
                {status && <StatusMessage>{status}</StatusMessage>}

                <Form
                    {...store.form()}
                    resetOnSuccess={["password"]}
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

                            <TextField
                                id="password"
                                label="Wachtwoord"
                                type="password"
                                name="password"
                                required
                                autoComplete="current-password"
                                placeholder="Je wachtwoord"
                                error={errors.password}
                            />

                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    label="Onthoud mij"
                                />
                                {canResetPassword && (
                                    <Link
                                        href={request()}
                                        className={`${authLinkClasses} text-sm leading-[19.6px] font-semibold md:text-xs md:leading-[18px]`}
                                    >
                                        Wachtwoord vergeten?
                                    </Link>
                                )}
                            </div>

                            <Button
                                type="submit"
                                fullWidth
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Inloggen
                            </Button>

                            {/* Pushes the footer to the bottom on mobile (Figma 1.4). */}
                            <div className="flex-1 md:hidden" />

                            <AuthFooterText>
                                Nog geen account?{" "}
                                <Link
                                    href={register()}
                                    className={authLinkClasses}
                                >
                                    Registreren
                                </Link>
                            </AuthFooterText>
                        </>
                    )}
                </Form>
            </AuthPanel>
        </>
    );
}

Login.layout = {
    topBar: "register",
};
