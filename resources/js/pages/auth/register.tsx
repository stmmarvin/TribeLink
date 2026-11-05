import { Head, Link, useForm } from "@inertiajs/react";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import {
    AuthFooterText,
    AuthPanel,
    authLinkClasses,
} from "@/components/tribelink/auth-panel";
import { Button, Spinner } from "@/components/tribelink/button";
import { TextField } from "@/components/tribelink/input";
import {
    validateConfirmation,
    validateHuMail,
    validateName,
    validatePassword,
    validateUsername,
    visibleErrors,
} from "@/lib/validation";
import { home, login } from "@/routes";
import { store } from "@/routes/register";

type Props = {
    passwordRules: string;
};

type Field =
    "name" | "username" | "email" | "password" | "password_confirmation";

const FIELDS: Field[] = [
    "name",
    "username",
    "email",
    "password",
    "password_confirmation",
];

export default function Register({ passwordRules }: Props) {
    const form = useForm({
        name: "",
        username: "",
        email: "",
        password: "",
        password_confirmation: "",
    });
    const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});

    const clientErrors: Partial<Record<Field, string>> = {
        name: validateName(form.data.name),
        username: validateUsername(form.data.username),
        email: validateHuMail(form.data.email),
        password: validatePassword(form.data.password, passwordRules),
        password_confirmation: validateConfirmation(
            form.data.password,
            form.data.password_confirmation,
        ),
    };
    const shownErrors = visibleErrors(clientErrors, touched);
    const hasClientErrors = Object.keys(shownErrors).length > 0;

    const errorFor = (field: Field) => shownErrors[field] ?? form.errors[field];

    const fieldProps = (field: Field) => ({
        id: field,
        name: field,
        value: form.data[field],
        error: errorFor(field),
        onChange: (event: ChangeEvent<HTMLInputElement>) => {
            form.setData(field, event.target.value);
            form.clearErrors(field);
        },
        onBlur: () => setTouched((current) => ({ ...current, [field]: true })),
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setTouched(Object.fromEntries(FIELDS.map((field) => [field, true])));

        const firstInvalid = FIELDS.find((field) => clientErrors[field]);

        if (firstInvalid) {
            document.getElementById(firstInvalid)?.focus();

            return;
        }

        form.submit(store(), {
            onFinish: () => form.reset("password", "password_confirmation"),
        });
    };

    return (
        <>
            <Head title="Account maken" />

            <AuthPanel title="Account maken" backHref={home()}>
                <form
                    noValidate
                    onSubmit={submit}
                    className="flex flex-1 flex-col gap-3.5 md:gap-5"
                >
                    <TextField
                        {...fieldProps("name")}
                        label="Echte naam"
                        type="text"
                        autoFocus
                        autoComplete="name"
                        placeholder="Voor- en achternaam"
                        hint="Alleen zichtbaar voor vertrouwde vrienden"
                        hintLocked
                    />

                    <TextField
                        {...fieldProps("username")}
                        label="Gebruikersnaam"
                        type="text"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="Bijv. sam_hu"
                    />

                    <TextField
                        {...fieldProps("email")}
                        label="HU-mail"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        placeholder="naam@student.hu.nl"
                    />

                    <TextField
                        {...fieldProps("password")}
                        label="Wachtwoord"
                        type="password"
                        autoComplete="new-password"
                        passwordrules={passwordRules}
                        placeholder="Kies een sterk wachtwoord"
                        dashedError={
                            !shownErrors.password && !!form.errors.password
                        }
                    />

                    <TextField
                        {...fieldProps("password_confirmation")}
                        label="Wachtwoord bevestigen"
                        type="password"
                        autoComplete="new-password"
                        passwordrules={passwordRules}
                        placeholder="Herhaal je wachtwoord"
                    />

                    {/* Pushes the button to the bottom on mobile (Figma 1.2). */}
                    <div className="flex-1 md:hidden" />

                    <Button
                        type="submit"
                        fullWidth
                        disabled={hasClientErrors || form.processing}
                        data-test="register-user-button"
                    >
                        {form.processing && <Spinner />}
                        Registreren
                    </Button>

                    {hasClientErrors ? (
                        <AuthFooterText>
                            Los de fouten hierboven op om door te gaan
                        </AuthFooterText>
                    ) : (
                        <AuthFooterText>
                            Al een account?{" "}
                            <Link href={login()} className={authLinkClasses}>
                                Inloggen
                            </Link>
                        </AuthFooterText>
                    )}
                </form>
            </AuthPanel>
        </>
    );
}

Register.layout = {
    topBar: "login",
};
