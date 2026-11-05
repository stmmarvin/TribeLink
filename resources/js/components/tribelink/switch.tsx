import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type SwitchProps = Omit<ComponentProps<"button">, "onChange"> & {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
};

/**
 * Figma "Toggle" (3.3 Profiel delen): 32×18 pill, brand gradient when on,
 * line colour when off, white knob. A <button role="switch">, so Space and
 * Enter toggle it and screen readers announce "aan"/"uit".
 */
export function Switch({
    checked,
    onCheckedChange,
    disabled,
    className,
    ...props
}: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onCheckedChange(!checked)}
            className={cn(
                "relative inline-flex h-[18px] w-8 shrink-0 cursor-pointer items-center rounded-full focus-ring transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                checked ? "bg-brand-gradient" : "bg-line",
                className,
            )}
            {...props}
        >
            <span
                aria-hidden="true"
                className={cn(
                    "absolute top-0.5 left-0.5 size-3.5 rounded-full bg-white shadow-sm transition-transform",
                    checked && "translate-x-3.5",
                )}
            />
        </button>
    );
}
