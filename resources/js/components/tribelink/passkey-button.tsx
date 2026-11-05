import type { UrlMethodPair } from "@inertiajs/core";
import { router } from "@inertiajs/react";
import { usePasskeyVerify } from "@laravel/passkeys/react";
import { Button, Spinner } from "./button";
import { FieldError } from "./input";

/**
 * TribeLink-styled version of the starter kit's passkey sign-in. Same logic
 * (Laravel Passkeys), only rendered when the browser supports passkeys.
 */
export function PasskeyButton({
    routes,
    label = "Inloggen met een passkey",
    loadingLabel = "Bezig met verifiëren…",
    separator = "of log in met je HU-mail",
}: {
    routes?: { options: UrlMethodPair; submit: UrlMethodPair };
    label?: string;
    loadingLabel?: string;
    separator?: string;
}) {
    const { verify, isLoading, error, isSupported } = usePasskeyVerify({
        ...(routes && {
            routes: {
                options: routes.options.url,
                submit: routes.submit.url,
            },
        }),
        onSuccess: (response) => {
            router.visit(response.redirect ?? "/dashboard");
        },
    });

    if (!isSupported) {
        return null;
    }

    return (
        <>
            <div className="flex flex-col gap-2">
                <Button
                    variant="secondary"
                    fullWidth
                    onClick={verify}
                    disabled={isLoading}
                >
                    {isLoading && <Spinner />}
                    {isLoading ? loadingLabel : label}
                </Button>
                <FieldError message={error ?? undefined} />
            </div>
            <div className="flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-line" />
                <span className="type-caption text-ink-muted">{separator}</span>
                <span className="h-px flex-1 bg-line" />
            </div>
        </>
    );
}
