import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { OTPInput, REGEXP_ONLY_DIGITS } from "input-otp";
import type { SlotProps } from "input-otp";
import {
    AuthFooterText,
    AuthPanel,
    authLinkClasses,
} from "@/components/tribelink/auth-panel";
import { Button, Spinner } from "@/components/tribelink/button";
import { FieldError } from "@/components/tribelink/input";
import { StatusMessage } from "@/components/tribelink/status-message";
import { cn } from "@/lib/utils";
import { logout } from "@/routes";

const CODE_LENGTH = 6;

/** One digit box, styled like the TribeLink text fields. */
function CodeSlot({
    char,
    isActive,
    hasFakeCaret,
    invalid,
}: SlotProps & { invalid: boolean }) {
    return (
        <div
            className={cn(
                "relative flex h-14 w-11 items-center justify-center rounded-field border bg-subtle font-display text-2xl font-bold text-ink transition-colors sm:h-16 sm:w-12",
                invalid ? "border-danger-text" : "border-line",
                isActive && "border-brand bg-surface ring-2 ring-brand/25",
                char && !isActive && "bg-surface",
            )}
        >
            {char}
            {hasFakeCaret && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-6 w-px animate-caret-blink bg-ink" />
                </div>
            )}
        </div>
    );
}

export default function VerifyEmail({ status }: { status?: string }) {
    const { auth } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({
        code: "",
    });
    const resendForm = useForm({});

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        post("/email/verify-code");
    };

    const resend = () => {
        resendForm.post("/email/resend-code", { preserveScroll: true });
    };

    return (
        <>
            <Head title="E-mail verifiëren" />

            <AuthPanel title="Check je HU-mail">
                <p className="text-center type-small text-ink-secondary">
                    We hebben een code van 6 cijfers gestuurd naar
                    <strong className="block font-semibold break-all text-ink">
                        {auth.user?.email ?? "je HU-mail"}
                    </strong>
                    Vul hem hieronder in om je account te activeren.
                </p>

                {status === "code-sent" && (
                    <StatusMessage>
                        Er is een nieuwe code naar je HU-mail gestuurd.
                    </StatusMessage>
                )}

                <form onSubmit={submit} className="flex flex-col gap-5">
                    <div className="flex flex-col items-center gap-2">
                        <OTPInput
                            maxLength={CODE_LENGTH}
                            value={data.code}
                            onChange={(value) => setData("code", value)}
                            pattern={REGEXP_ONLY_DIGITS}
                            disabled={processing}
                            autoFocus
                            aria-label="Verificatiecode"
                            containerClassName="flex items-center gap-2 has-disabled:opacity-60 sm:gap-2.5"
                            render={({ slots }) => (
                                <>
                                    {slots.map((slot, index) => (
                                        <CodeSlot
                                            key={index}
                                            {...slot}
                                            invalid={!!errors.code}
                                        />
                                    ))}
                                </>
                            )}
                        />
                        <FieldError message={errors.code} />
                    </div>

                    <Button
                        type="submit"
                        fullWidth
                        disabled={processing || data.code.length < CODE_LENGTH}
                    >
                        {processing && <Spinner />}
                        Bevestigen
                    </Button>
                </form>

                <div className="flex flex-col items-center gap-3">
                    <AuthFooterText>
                        Geen code ontvangen? Kijk ook in je spam, of{" "}
                        <button
                            type="button"
                            onClick={resend}
                            disabled={resendForm.processing}
                            className={cn(
                                authLinkClasses,
                                "cursor-pointer disabled:cursor-wait disabled:opacity-60",
                            )}
                        >
                            stuur een nieuwe code
                        </button>
                    </AuthFooterText>

                    <AuthFooterText>
                        Verkeerd account?{" "}
                        <Link
                            href={logout()}
                            as="button"
                            onClick={() => router.flushAll()}
                            className={cn(authLinkClasses, "cursor-pointer")}
                        >
                            Uitloggen
                        </Link>
                    </AuthFooterText>
                </div>
            </AuthPanel>
        </>
    );
}
