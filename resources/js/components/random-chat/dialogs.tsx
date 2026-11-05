import { useState } from "react";
import type { FormEvent } from "react";
import { Button, Spinner } from "@/components/tribelink/button";
import { inputClasses } from "@/components/tribelink/input";
import { Modal } from "@/components/tribelink/modal";
import { cn } from "@/lib/utils";
import type { RandomChatReport, ReportReason } from "@/types";

const textButtonClasses =
    "cursor-pointer self-center rounded-sm font-display text-base leading-[19.6px] font-semibold text-ink underline underline-offset-2 transition-colors hover:text-brand-aa focus-ring";

/** Figma 2.10 "Chat verlaten?" — only shown when the partner isn't saved. */
export function LeaveDialog({
    open,
    username,
    onClose,
    onLeave,
    onSaveAndLeave,
}: {
    open: boolean;
    username: string;
    onClose: () => void;
    onLeave: () => void;
    onSaveAndLeave: () => Promise<void>;
}) {
    const [saving, setSaving] = useState(false);

    const saveAndLeave = async () => {
        setSaving(true);

        try {
            await onSaveAndLeave();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Chat verlaten?"
            description={`Je hebt @${username} niet bewaard. Na het verlaten kun je dit gesprek niet meer terugvinden.`}
        >
            <div className="flex flex-col gap-3">
                <Button variant="danger" fullWidth onClick={onLeave}>
                    Verlaten zonder bewaren
                </Button>
                <Button
                    variant="secondary"
                    fullWidth
                    onClick={saveAndLeave}
                    disabled={saving}
                    aria-busy={saving}
                >
                    {saving && <Spinner />}
                    Eerst bewaren
                </Button>
                <button
                    type="button"
                    onClick={onClose}
                    className={cn(textButtonClasses, "mt-1")}
                >
                    Annuleren
                </button>
            </div>
        </Modal>
    );
}

const reasons: Array<{ value: ReportReason; label: string }> = [
    { value: "spam", label: "Spam of reclame" },
    { value: "inappropriate", label: "Ongepaste of seksuele berichten" },
    { value: "harassment", label: "Pesten, intimidatie of bedreiging" },
    { value: "other", label: "Iets anders" },
];

/** Not in Figma: report the partner (built in the 2.10 overlay style). */
export function ReportDialog({
    open,
    username,
    onClose,
    onReport,
}: {
    open: boolean;
    username: string;
    onClose: () => void;
    onReport: (report: RandomChatReport) => Promise<void>;
}) {
    const [reason, setReason] = useState<ReportReason | null>(null);
    const [details, setDetails] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const close = () => {
        setReason(null);
        setDetails("");
        setError(null);
        onClose();
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();

        if (!reason) {
            setError("Kies waarom je @" + username + " meldt.");

            return;
        }

        setSending(true);
        setError(null);

        try {
            await onReport({ reason, details: details.trim() || undefined });
            close();
        } catch {
            setError(
                "Je melding kon niet worden verstuurd. Probeer het opnieuw.",
            );
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={close}
            title={`@${username} melden`}
            description="Je melding is anoniem. Na het melden wordt deze chat beëindigd."
        >
            <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
                <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 type-field-label text-ink">
                        Wat is er aan de hand?
                    </legend>
                    {reasons.map((option) => (
                        <label
                            key={option.value}
                            className={cn(
                                "flex cursor-pointer items-center gap-3 rounded-field border px-3.5 py-3 type-small text-ink transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
                                reason === option.value
                                    ? "border-brand bg-brand/10"
                                    : "border-line hover:bg-subtle",
                            )}
                        >
                            <input
                                type="radio"
                                name="report-reason"
                                value={option.value}
                                checked={reason === option.value}
                                onChange={() => setReason(option.value)}
                                className="size-4 accent-brand focus:outline-none"
                            />
                            {option.label}
                        </label>
                    ))}
                </fieldset>

                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="report-details"
                        className="type-field-label text-ink"
                    >
                        Toelichting (optioneel)
                    </label>
                    <textarea
                        id="report-details"
                        rows={3}
                        maxLength={500}
                        value={details}
                        onChange={(event) => setDetails(event.target.value)}
                        className={cn(
                            inputClasses,
                            "h-auto resize-none py-2.5 md:h-auto",
                        )}
                    />
                </div>

                {error && (
                    <p role="alert" className="type-caption text-danger-text">
                        {error}
                    </p>
                )}

                <div className="flex flex-col gap-3">
                    <Button
                        type="submit"
                        variant="danger"
                        fullWidth
                        disabled={sending}
                        aria-busy={sending}
                    >
                        {sending && <Spinner />}
                        Melden en chat beëindigen
                    </Button>
                    <button
                        type="button"
                        onClick={close}
                        className={cn(textButtonClasses, "mt-1")}
                    >
                        Annuleren
                    </button>
                </div>
            </form>
        </Modal>
    );
}
