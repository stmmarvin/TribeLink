import { Link } from "@inertiajs/react";
import { create as feedCreate } from "@/routes/feed";
import { PlusIcon } from "./plus-icon";

/** Mobile floating "+" button (Figma 2.1 / 4.7): write a new post (Figma 4.1). */
export function Fab({ label = "Nieuwe post" }: { label?: string }) {
    return (
        <Link
            href={feedCreate()}
            aria-label={label}
            className="fixed right-[18px] bottom-[calc(84px+env(safe-area-inset-bottom))] z-20 flex size-[52px] items-center justify-center rounded-full bg-brand-aa text-white shadow-cta transition-colors hover:bg-brand focus-ring lg:hidden"
        >
            <PlusIcon size={18} thickness={3} />
        </Link>
    );
}
