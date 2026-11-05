import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

type Tab<T extends string> = { value: T; label: string };

/**
 * Figma "Segmented" + "Desktop/Tab": subtle track, active tab is a white pill
 * with a soft shadow. Implements the WAI-ARIA tabs pattern (arrow keys).
 */
export function SegmentedTabs<T extends string>({
    tabs,
    value,
    onChange,
    label,
    idPrefix,
    panelIdPrefix = idPrefix,
    fullWidth = false,
}: {
    tabs: Tab<T>[];
    value: T;
    onChange: (value: T) => void;
    label: string;
    idPrefix: string;
    /** Id prefix of the controlled tabpanel, when it differs from `idPrefix`. */
    panelIdPrefix?: string;
    fullWidth?: boolean;
}) {
    const refs = useRef<(HTMLButtonElement | null)[]>([]);

    const onKeyDown = (event: KeyboardEvent, index: number) => {
        const delta =
            event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;

        if (!delta) {
            return;
        }

        event.preventDefault();
        const next = (index + delta + tabs.length) % tabs.length;
        onChange(tabs[next].value);
        refs.current[next]?.focus();
    };

    return (
        <div
            role="tablist"
            aria-label={label}
            className={cn(
                "flex gap-0.5 rounded-btn bg-subtle p-[3px]",
                fullWidth ? "w-full" : "self-start",
            )}
        >
            {tabs.map((tab, index) => {
                const active = tab.value === value;

                return (
                    <button
                        key={tab.value}
                        ref={(el) => {
                            refs.current[index] = el;
                        }}
                        id={`${idPrefix}-tab-${tab.value}`}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-controls={`${panelIdPrefix}-panel-${tab.value}`}
                        tabIndex={active ? 0 : -1}
                        onClick={() => onChange(tab.value)}
                        onKeyDown={(event) => onKeyDown(event, index)}
                        className={cn(
                            "cursor-pointer rounded-tab px-[18px] py-2 font-display text-sm leading-[1.4] font-semibold focus-ring transition-colors md:text-sm",
                            fullWidth && "flex-1 text-base md:text-sm",
                            active
                                ? "bg-surface text-brand-aa shadow-pressed"
                                : "text-ink-secondary hover:bg-brand/10 hover:text-ink",
                        )}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
