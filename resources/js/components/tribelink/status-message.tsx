import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Success/info banner (Teal tint + Teal Dark AA text from the Figma palette). */
export function StatusMessage({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <p
            role="status"
            className={cn(
                "rounded-field bg-brand-teal/15 px-3.5 py-3 type-label text-brand-teal-dark",
                className,
            )}
        >
            {children}
        </p>
    );
}
