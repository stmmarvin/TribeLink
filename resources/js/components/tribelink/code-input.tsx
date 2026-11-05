import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Figma "Code invoer" (1.3 E-mail verifiëren): six 56px boxes, the box that
 * receives the next digit gets the 1.5px Ocean Blue border. One real input
 * sits on top so paste, autofill (one-time-code) and screen readers work.
 */
export function CodeInput({
    id,
    name,
    label,
    value,
    onChange,
    length = 6,
    disabled,
    autoFocus,
    error,
}: {
    id: string;
    name: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    length?: number;
    disabled?: boolean;
    autoFocus?: boolean;
    error?: boolean;
}) {
    const [focused, setFocused] = useState(false);
    const activeIndex = Math.min(value.length, length - 1);

    return (
        <div className="relative">
            <label htmlFor={id} className="sr-only">
                {label}
            </label>
            <input
                id={id}
                name={name}
                value={value}
                onChange={(event) =>
                    onChange(
                        event.target.value.replace(/\D/g, "").slice(0, length),
                    )
                }
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d*"
                maxLength={length}
                disabled={disabled}
                autoFocus={autoFocus}
                aria-invalid={error ? true : undefined}
                className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
            />
            <div className="flex gap-2.5" aria-hidden="true">
                {Array.from({ length }, (_, index) => {
                    const active = focused && index === activeIndex;

                    return (
                        <span
                            key={index}
                            className={cn(
                                "flex h-14 min-w-0 flex-1 items-center justify-center rounded-field border bg-surface type-h3 text-ink transition-colors",
                                active
                                    ? "border-[1.5px] border-brand"
                                    : error
                                      ? "border-[1.5px] border-danger bg-danger-surface"
                                      : "border-line",
                            )}
                        >
                            {value[index] ?? ""}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
