import { Form, Head, Link, router, usePage } from "@inertiajs/react";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import ProfileController from "@/actions/App/Http/Controllers/Settings/ProfileController";
import SecurityController from "@/actions/App/Http/Controllers/Settings/SecurityController";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { BannerUpload } from "@/components/profile/banner-upload";
import { DeleteAccount } from "@/components/profile/delete-account";
import { BackLink, MobileHeader } from "@/components/tribelink/back-link";
import { Button, ButtonLink, Spinner } from "@/components/tribelink/button";
import { Card } from "@/components/tribelink/card";
import { TextAreaField, TextField } from "@/components/tribelink/input";
import { StatusMessage } from "@/components/tribelink/status-message";
import { PageHeader } from "@/layouts/app-layout";
import { usernameFor } from "@/lib/user";
import { validateConfirmation, validatePassword } from "@/lib/validation";
import { logout } from "@/routes";
import { show } from "@/routes/profile";
import { send } from "@/routes/verification";

function Section({
    id,
    title,
    description,
    children,
}: {
    id: string;
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <Card className="p-5 md:p-6">
            <section aria-labelledby={id} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                    <h2 id={id} className="type-h3 text-ink">
                        {title}
                    </h2>
                    {description && (
                        <p className="type-small text-ink-secondary">
                            {description}
                        </p>
                    )}
                </div>
                {children}
            </section>
        </Card>
    );
}

function SavedNotice({ show: visible }: { show: boolean }) {
    return (
        <span
            aria-live="polite"
            className="type-label text-brand-teal-dark transition-opacity"
            style={{ opacity: visible ? 1 : 0 }}
        >
            {visible ? "Opgeslagen" : ""}
        </span>
    );
}

// Contact fields are not stored by the backend yet; read them defensively.
const stringField = (value: unknown) =>
    typeof value === "string" ? value : "";

// Not in Figma (only the menu item "Profiel bewerken" exists): designed in the
// style of 4.7 "Eigen profiel" and the auth forms.
export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage().props;
    const [bio, setBio] = useState(
        typeof auth.user.bio === "string" ? auth.user.bio : "",
    );
    const [posterMessage, setPosterMessage] = useState(
        typeof auth.user.poster_message === "string"
            ? auth.user.poster_message
            : "",
    );
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);
    const [newPassword, setNewPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [passwordTouched, setPasswordTouched] = useState({
        password: false,
        confirm: false,
    });

    const newPasswordError = passwordTouched.password
        ? validatePassword(newPassword)
        : undefined;
    const confirmationError = passwordTouched.confirm
        ? validateConfirmation(newPassword, confirmation)
        : undefined;

    return (
        <>
            <Head title="Profiel bewerken" />
            <PageHeader title="Profiel bewerken" />

            <div className="px-5 pt-1 pb-8 md:px-10 md:py-8 xl:px-[72px]">
                <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3.5 md:gap-6">
                    <MobileHeader
                        title="Profiel bewerken"
                        backHref={show()}
                        className="md:hidden"
                    />
                    <BackLink href={show()} className="hidden md:inline-flex" />

                    <Section
                        id="photo-title"
                        title="Profielfoto"
                        description="Deze foto zien anderen naast je gebruikersnaam."
                    >
                        <AvatarUpload
                            name={usernameFor(auth.user)}
                            currentUrl={auth.user.avatar}
                        />
                    </Section>

                    <Section
                        id="banner-title"
                        title="Banner"
                        description="De brede afbeelding achter je profielfoto."
                    >
                        <BannerUpload currentUrl={auth.user.banner} />
                    </Section>

                    <Section
                        id="details-title"
                        title="Gegevens"
                        description="Je echte naam is alleen zichtbaar voor vertrouwde vrienden."
                    >
                        <Form
                            {...ProfileController.update.form()}
                            options={{ preserveScroll: true }}
                            className="flex flex-col gap-5"
                        >
                            {({ processing, errors, recentlySuccessful }) => (
                                <>
                                    <TextField
                                        id="username"
                                        name="username"
                                        label="Gebruikersnaam"
                                        defaultValue={usernameFor(auth.user)}
                                        required
                                        autoComplete="username"
                                        autoCapitalize="none"
                                        spellCheck={false}
                                        hint="Letters, cijfers en underscores"
                                        error={errors.username}
                                    />

                                    <TextField
                                        id="name"
                                        name="name"
                                        label="Echte naam"
                                        defaultValue={auth.user.name}
                                        required
                                        autoComplete="name"
                                        hint="Alleen zichtbaar voor vertrouwde vrienden"
                                        hintLocked
                                        error={errors.name}
                                    />

                                    <TextField
                                        id="email"
                                        name="email"
                                        type="email"
                                        label="HU-mail"
                                        defaultValue={auth.user.email}
                                        required
                                        autoComplete="username"
                                        error={errors.email}
                                    />

                                    {mustVerifyEmail &&
                                        auth.user.email_verified_at ===
                                            null && (
                                            <div className="flex flex-col gap-2">
                                                <p className="type-small text-ink-secondary">
                                                    Je HU-mail is nog niet
                                                    geverifieerd.{" "}
                                                    <Link
                                                        href={send()}
                                                        as="button"
                                                        className="cursor-pointer rounded-sm font-display font-bold text-ink underline underline-offset-2 focus-ring hover:text-brand-aa"
                                                    >
                                                        Stuur de verificatiemail
                                                        opnieuw.
                                                    </Link>
                                                </p>
                                                {status ===
                                                    "verification-link-sent" && (
                                                    <StatusMessage>
                                                        Er is een nieuwe
                                                        verificatielink naar je
                                                        HU-mail gestuurd.
                                                    </StatusMessage>
                                                )}
                                            </div>
                                        )}

                                    <TextAreaField
                                        id="bio"
                                        name="bio"
                                        label="Bio"
                                        value={bio}
                                        onChange={(event) =>
                                            setBio(event.target.value)
                                        }
                                        maxLength={160}
                                        rows={3}
                                        hint={`${bio.length}/160 tekens · bijv. je opleiding en jaar`}
                                        error={errors.bio}
                                    />

                                    <TextAreaField
                                        id="poster_message"
                                        name="poster_message"
                                        label="Posterbericht"
                                        value={posterMessage}
                                        onChange={(event) =>
                                            setPosterMessage(event.target.value)
                                        }
                                        maxLength={1000}
                                        rows={3}
                                        hint="Staat groot op je openbare poster met QR-code"
                                        error={errors.poster_message}
                                    />

                                    <fieldset className="flex flex-col gap-5 border-t border-line pt-5">
                                        <legend className="sr-only">
                                            Contactgegevens
                                        </legend>
                                        <div className="flex flex-col gap-1">
                                            <h3 className="font-display text-sm font-bold text-ink">
                                                Contactgegevens
                                            </h3>
                                            <p className="type-small text-ink-secondary">
                                                Optioneel. Alleen zichtbaar voor
                                                mensen met wie je je volledige
                                                profiel deelt en die jij
                                                toestemming geeft.
                                            </p>
                                        </div>
                                        <TextField
                                            id="contact_email"
                                            name="contact_email"
                                            type="email"
                                            label="Contact-e-mail"
                                            defaultValue={stringField(
                                                auth.user.contact_email,
                                            )}
                                            autoComplete="email"
                                            hint="Mag een ander adres zijn dan je HU-mail"
                                            hintLocked
                                            error={errors.contact_email}
                                        />
                                        <TextField
                                            id="contact_phone"
                                            name="contact_phone"
                                            type="tel"
                                            label="Telefoonnummer"
                                            defaultValue={stringField(
                                                auth.user.contact_phone,
                                            )}
                                            autoComplete="tel"
                                            hintLocked
                                            hint="Alleen voor vrienden met wie je alles deelt"
                                            error={errors.contact_phone}
                                        />
                                        <TextField
                                            id="contact_socials"
                                            name="contact_socials"
                                            label="Socials"
                                            defaultValue={stringField(
                                                auth.user.contact_socials,
                                            )}
                                            placeholder="bijv. Instagram @naam"
                                            hintLocked
                                            hint="Alleen voor vrienden met wie je alles deelt"
                                            error={errors.contact_socials}
                                        />
                                    </fieldset>

                                    <div className="flex items-center gap-4">
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            className="w-full sm:w-auto"
                                            data-test="update-profile-button"
                                        >
                                            {processing && <Spinner />}
                                            Opslaan
                                        </Button>
                                        <SavedNotice
                                            show={recentlySuccessful}
                                        />
                                    </div>
                                </>
                            )}
                        </Form>
                    </Section>

                    <Section
                        id="password-title"
                        title="Wachtwoord wijzigen"
                        description="Gebruik een lang, uniek wachtwoord om je account veilig te houden."
                    >
                        <Form
                            {...SecurityController.update.form()}
                            options={{ preserveScroll: true }}
                            resetOnError={[
                                "password",
                                "password_confirmation",
                                "current_password",
                            ]}
                            resetOnSuccess
                            onBefore={() => {
                                setPasswordTouched({
                                    password: true,
                                    confirm: true,
                                });

                                return !(
                                    validatePassword(newPassword) ||
                                    validateConfirmation(
                                        newPassword,
                                        confirmation,
                                    )
                                );
                            }}
                            onSuccess={() => {
                                setNewPassword("");
                                setConfirmation("");
                                setPasswordTouched({
                                    password: false,
                                    confirm: false,
                                });
                            }}
                            onError={(errors) => {
                                if (errors.password) {
                                    passwordInput.current?.focus();
                                }

                                if (errors.current_password) {
                                    currentPasswordInput.current?.focus();
                                }
                            }}
                            className="flex flex-col gap-5"
                        >
                            {({ errors, processing, recentlySuccessful }) => (
                                <>
                                    <TextField
                                        ref={currentPasswordInput}
                                        id="current_password"
                                        name="current_password"
                                        type="password"
                                        label="Huidig wachtwoord"
                                        autoComplete="current-password"
                                        error={errors.current_password}
                                    />
                                    <TextField
                                        ref={passwordInput}
                                        id="password"
                                        name="password"
                                        type="password"
                                        label="Nieuw wachtwoord"
                                        autoComplete="new-password"
                                        value={newPassword}
                                        onChange={(event) =>
                                            setNewPassword(event.target.value)
                                        }
                                        onBlur={() =>
                                            setPasswordTouched((current) => ({
                                                ...current,
                                                password: true,
                                            }))
                                        }
                                        error={
                                            newPasswordError ?? errors.password
                                        }
                                        dashedError={
                                            !newPasswordError &&
                                            !!errors.password
                                        }
                                    />
                                    <TextField
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        type="password"
                                        label="Nieuw wachtwoord bevestigen"
                                        autoComplete="new-password"
                                        value={confirmation}
                                        onChange={(event) =>
                                            setConfirmation(event.target.value)
                                        }
                                        onBlur={() =>
                                            setPasswordTouched((current) => ({
                                                ...current,
                                                confirm: true,
                                            }))
                                        }
                                        error={
                                            confirmationError ??
                                            errors.password_confirmation
                                        }
                                    />
                                    <div className="flex flex-wrap items-center gap-4">
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            className="w-full sm:w-auto"
                                            data-test="update-password-button"
                                        >
                                            {processing && <Spinner />}
                                            Wachtwoord opslaan
                                        </Button>
                                        <SavedNotice
                                            show={recentlySuccessful}
                                        />
                                    </div>
                                </>
                            )}
                        </Form>
                    </Section>

                    {/* Calm row; the red confirmation lives in the modal. */}
                    <Card className="p-5 md:p-6">
                        <section
                            aria-labelledby="delete-title"
                            className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6"
                        >
                            <div className="flex flex-col gap-1">
                                <h2
                                    id="delete-title"
                                    className="font-display text-base leading-[21px] font-bold text-ink"
                                >
                                    Account verwijderen
                                </h2>
                                <p className="type-small text-ink-secondary">
                                    Je profiel, contacten en berichten worden
                                    definitief verwijderd.
                                </p>
                            </div>
                            <DeleteAccount />
                        </section>
                    </Card>

                    {/* Mobile has no sidebar profile menu, so offer logout here. */}
                    <ButtonLink
                        href={logout()}
                        as="button"
                        variant="secondary"
                        fullWidth
                        onClick={() => router.flushAll()}
                        className="lg:hidden"
                    >
                        Uitloggen
                    </ButtonLink>
                </div>
            </div>
        </>
    );
}
