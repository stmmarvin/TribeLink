import { useLayoutEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Button } from "@/components/tribelink/button";
import { inputClasses } from "@/components/tribelink/input";
import { cn } from "@/lib/utils";

const MAX_HEIGHT = 160;

/**
 * Figma "Composer": message field + "Stuur". The field grows with its
 * content (up to 160px). Enter sends, Shift+Enter adds a new line.
 *
 * The field is only cleared once the page calls `clear` (after a successful
 * send), so the text survives a failed request.
 */
export function Composer({
    onSend,
    sending = false,
    error = null,
    disabled = false,
}: {
    onSend: (body: string, clear: () => void) => void;
    sending?: boolean;
    error?: string | null;
    disabled?: boolean;
}) {
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const canSend = value.trim().length > 0 && !disabled && !sending;

    useLayoutEffect(() => {
        const element = textareaRef.current;

        if (!element) {
            return;
        }

        element.style.height = "auto";
        element.style.height = `${Math.min(element.scrollHeight + 2, MAX_HEIGHT)}px`;
        element.style.overflowY =
            element.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
    }, [value]);

    const send = () => {
        if (!canSend) {
            return;
        }

        onSend(value, () => {
            setValue("");
            textareaRef.current?.focus();
        });
    };

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        send();
    };

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
        ) {
            event.preventDefault();
            send();
        }
    };

    return (
        <form
            onSubmit={onSubmit}
            aria-busy={sending}
            className="flex flex-wrap items-end gap-2 md:gap-2.5"
        >
            <label htmlFor="composer" className="sr-only">
                Typ een bericht
            </label>
            <textarea
                id="composer"
                ref={textareaRef}
                rows={1}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Typ een bericht…"
                disabled={disabled}
                aria-describedby={
                    error ? "composer-hint composer-error" : "composer-hint"
                }
                aria-invalid={error ? true : undefined}
                className={cn(
                    inputClasses,
                    "max-h-40 flex-1 resize-none py-[10px] leading-[1.5] md:h-auto md:min-h-12 md:py-3",
                )}
            />
            <span id="composer-hint" className="sr-only">
                Enter verstuurt, Shift + Enter voor een nieuwe regel.
            </span>
            <Button
                type="submit"
                size="sm"
                disabled={!canSend}
                className="mb-[3px] h-[38px] w-[72px] md:hidden"
            >
                Stuur
            </Button>
            <Button
                type="submit"
                disabled={!canSend}
                className="hidden w-24 md:inline-flex"
            >
                Stuur
            </Button>
            {error && (
                <p
                    id="composer-error"
                    role="alert"
                    className="w-full type-caption text-danger-text"
                >
                    {error}
                </p>
            )}
        </form>
    );
}
