import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { icons } from "./icons";

// Figma "Input": Subtle Surface fill, 1px border, 12px radius,
// 44px (mobile) / 48px (desktop) high. Error state: Error Surface fill,
// 1.5px Error border, 14px radius (dashed for server-side errors).
export const inputClasses =
    "w-full min-h-11 rounded-field border border-line bg-subtle px-3 type-small text-ink transition-colors placeholder:text-placeholder md:h-12 md:px-3.5 focus:border-brand focus:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-60 read-only:text-ink-secondary";

const errorClasses =
    "rounded-btn border-[1.5px] border-danger bg-danger-surface focus:border-danger focus:bg-danger-surface focus-visible:ring-danger/25";

export function FieldLabel({ className, ...props }: ComponentProps<"label">) {
    return (
        <label
            className={cn("type-field-label text-ink", className)}
            {...props}
        />
    );
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
    if (!message) {
        return null;
    }

    return (
        <p id={id} role="alert" className="flex items-start gap-1.5">
            <span
                aria-hidden="true"
                className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-danger font-display text-xs leading-4 font-bold text-white"
            >
                !
            </span>
            <span className="type-label text-danger-text">{message}</span>
        </p>
    );
}

export function FieldHint({
    id,
    children,
    locked = false,
}: {
    id?: string;
    children: ReactNode;
    locked?: boolean;
}) {
    return (
        <p
            id={id}
            className="flex items-center gap-1.5 type-caption text-ink-secondary"
        >
            {locked && <img src={icons.lock} alt="" width={12} height={12} />}
            {children}
        </p>
    );
}

type TextFieldProps = ComponentProps<"input"> & {
    id: string;
    label: string;
    error?: string;
    hint?: ReactNode;
    hintLocked?: boolean;
    /** Figma shows server-side errors (e.g. leaked password) with a dashed border. */
    dashedError?: boolean;
    labelClassName?: string;
};

export function TextField({
    id,
    label,
    error,
    hint,
    hintLocked,
    dashedError = false,
    className,
    labelClassName,
    ...props
}: TextFieldProps) {
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;

    return (
        <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={id} className={labelClassName}>
                {label}
            </FieldLabel>
            <input
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={
                    [hintId, errorId].filter(Boolean).join(" ") || undefined
                }
                className={cn(
                    inputClasses,
                    error && errorClasses,
                    error && dashedError && "border-dashed",
                    className,
                )}
                {...props}
            />
            {hint && (
                <FieldHint id={hintId} locked={hintLocked}>
                    {hint}
                </FieldHint>
            )}
            <FieldError id={errorId} message={error} />
        </div>
    );
}

type TextAreaFieldProps = ComponentProps<"textarea"> & {
    id: string;
    label: string;
    error?: string;
    hint?: ReactNode;
};

export function TextAreaField({
    id,
    label,
    error,
    hint,
    className,
    ...props
}: TextAreaFieldProps) {
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;

    return (
        <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <textarea
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={
                    [hintId, errorId].filter(Boolean).join(" ") || undefined
                }
                className={cn(
                    inputClasses,
                    "min-h-24 resize-y py-3 md:h-auto",
                    error && errorClasses,
                    className,
                )}
                {...props}
            />
            {hint && <FieldHint id={hintId}>{hint}</FieldHint>}
            <FieldError id={errorId} message={error} />
        </div>
    );
}

export function Checkbox({
    id,
    label,
    className,
    ...props
}: Omit<ComponentProps<"input">, "type"> & { id: string; label: string }) {
    return (
        <label
            htmlFor={id}
            className={cn(
                "inline-flex cursor-pointer items-center gap-2.5 type-small text-ink-secondary",
                className,
            )}
        >
            <input
                id={id}
                type="checkbox"
                className="size-4.5 cursor-pointer rounded accent-brand-aa focus-ring"
                {...props}
            />
            {label}
        </label>
    );
}
