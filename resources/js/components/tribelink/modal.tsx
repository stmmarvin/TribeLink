import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ModalProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: ReactNode;
    children?: ReactNode;
    className?: string;
};

/**
 * Figma "Overlay – Chat verlaten?": centred white panel (440px, 20px radius,
 * 32px padding) on a 40% Overlay backdrop. Built on the native <dialog>
 * element, so focus trapping, Esc-to-close and the top layer come for free.
 */
export function Modal({
    open,
    onClose,
    title,
    description,
    children,
    className,
}: ModalProps) {
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        const dialog = ref.current;

        if (!dialog) {
            return;
        }

        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog
            ref={ref}
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            aria-modal="true"
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            onClick={(event) => {
                // A click on the dialog element itself is a click on the backdrop.
                if (event.target === ref.current) {
                    onClose();
                }
            }}
            className={cn(
                "m-auto w-[calc(100%-32px)] max-w-[440px] overflow-visible rounded-panel border border-line bg-surface p-0 text-ink scheme-light shadow-modal backdrop:bg-overlay/40",
                className,
            )}
        >
            {open && (
                <div className="flex flex-col gap-4 p-6 md:p-8">
                    <h2 id={titleId} className="type-h3 text-ink">
                        {title}
                    </h2>
                    {description && (
                        <div
                            id={descriptionId}
                            className="type-small text-ink-secondary"
                        >
                            {description}
                        </div>
                    )}
                    {children}
                </div>
            )}
        </dialog>
    );
}
