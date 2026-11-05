import { Check, Flag } from "lucide-react";
import { useState } from "react";
import type { ButtonSize, ButtonVariant } from "@/components/tribelink/button";
import { Button, Spinner } from "@/components/tribelink/button";
import { cn } from "@/lib/utils";

/** "Bewaren" → "Bewaard" once the partner is saved as a contact. */
export function SaveButton({
    saved,
    onSave,
    variant = "primary",
    size = "lg",
    fullWidth = false,
    disabled = false,
    className,
}: {
    saved: boolean;
    onSave: () => Promise<void>;
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    disabled?: boolean;
    className?: string;
}) {
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);

        try {
            await onSave();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            fullWidth={fullWidth}
            onClick={save}
            disabled={disabled || saving || saved}
            aria-busy={saving}
            className={className}
        >
            {saved ? (
                <>
                    <Check aria-hidden="true" className="size-4" />
                    Bewaard
                </>
            ) : (
                <>
                    {saving && <Spinner />}
                    Bewaren
                </>
            )}
        </Button>
    );
}

/** Flag icon button for "Gebruiker melden" (right slot of the chat header). */
export function ReportButton({
    username,
    onClick,
    disabled = false,
    className,
}: {
    username: string;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={`@${username} melden`}
            title="Melden"
            className={cn(
                "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-logo text-ink-secondary transition-colors hover:bg-danger-surface hover:text-danger-text focus-ring disabled:cursor-not-allowed disabled:opacity-50 md:size-9",
                className,
            )}
        >
            <Flag aria-hidden="true" className="size-[18px]" />
        </button>
    );
}

/** Figma 2.4b: "Opnieuw verbinden…" — dark pill on mobile, blue chip on desktop. */
export function ReconnectingNotice() {
    return (
        <p
            role="status"
            className="absolute top-14 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2.5 rounded-full bg-overlay px-[18px] py-2.5 type-label whitespace-nowrap text-white md:static md:translate-x-0 md:gap-1.5 md:bg-brand-aa md:px-2.5 md:py-[3px] md:text-xs md:leading-[18px]"
        >
            <Spinner className="size-3.5 md:size-2.5 md:border" />
            Opnieuw verbinden…
        </p>
    );
}
