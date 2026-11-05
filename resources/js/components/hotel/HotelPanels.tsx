import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ONLINE_ROOMS, PALETTE, randomLook } from "@/game/rooms";
import type { AvatarLook, ChatEntry, HairStyle, Selection } from "@/game/types";
import { AvatarPreview } from "./AvatarPreview";

/** Zwevend paneel in de hotel-UI (navigator, avatar, chatlog). */
export function HotelPanel({
    title,
    onClose,
    children,
    className,
}: {
    title: string;
    onClose: () => void;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            aria-label={title}
            className={cn(
                "absolute inset-x-3 top-14 z-30 flex max-h-[calc(100%-200px)] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card lg:inset-x-auto lg:left-4 lg:top-16 lg:max-h-[calc(100%-160px)] lg:w-80",
                className,
            )}
        >
            {/* Effen blauw, net als de spel-popups (games/game-popup.tsx) */}
            <header className="flex items-center justify-between bg-brand px-4 py-2.5">
                <h2 className="font-pixel text-[13px] uppercase tracking-wide text-white">
                    {title}
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Sluiten"
                    className="flex size-7 items-center justify-center rounded-pill text-white hover:bg-white/20"
                >
                    ✕
                </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
        </section>
    );
}

export function Navigator({
    current,
    people,
    onPick,
}: {
    current: string;
    people: number;
    onPick: (id: string) => void;
}) {
    return (
        <ul className="flex flex-col gap-2">
            {ONLINE_ROOMS.map((r) => {
                const active = r.id === current;
                return (
                    <li key={r.id}>
                        <button
                            type="button"
                            onClick={() => onPick(r.id)}
                            className={cn(
                                "flex w-full items-center gap-3 rounded-input border p-3 text-left transition-colors",
                                active
                                    ? "border-blue bg-blue/10"
                                    : "border-line hover:bg-subtle",
                            )}
                        >
                            <span
                                className="size-10 shrink-0 rounded-tile border border-line"
                                style={{
                                    background: `linear-gradient(135deg, ${r.colors.wallLeft}, ${r.colors.floorB})`,
                                }}
                            />
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="font-jakarta text-label text-ink">
                                    {r.name}
                                </span>
                                {r.description && (
                                    <span className="truncate text-caption text-ink-secondary">
                                        {r.description}
                                    </span>
                                )}
                            </span>
                            {active && (
                                <span className="rounded-pill bg-teal/15 px-2 py-0.5 font-jakarta text-[12px] font-semibold text-teal-dark">
                                    {people}
                                </span>
                            )}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

function Swatches({
    label,
    colors,
    value,
    onChange,
}: {
    label: string;
    colors: string[];
    value: string;
    onChange: (c: string) => void;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <p className="font-jakarta text-[12px] font-semibold text-ink">
                {label}
            </p>
            <div className="flex flex-wrap gap-1.5">
                {colors.map((c) => (
                    <button
                        key={c}
                        type="button"
                        aria-label={`${label} ${c}`}
                        aria-pressed={c === value}
                        onClick={() => onChange(c)}
                        className={cn(
                            "size-7 rounded-tile border border-line",
                            c === value && "ring-2 ring-blue ring-offset-1",
                        )}
                        style={{ background: c }}
                    />
                ))}
            </div>
        </div>
    );
}

export function AvatarEditor({
    look,
    onChange,
}: {
    look: AvatarLook;
    onChange: (l: AvatarLook) => void;
}) {
    const set = (patch: Partial<AvatarLook>) => onChange({ ...look, ...patch });
    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-end justify-center gap-2 rounded-input bg-media-gradient py-2">
                <AvatarPreview look={look} size={56} dir={2} />
                <AvatarPreview look={look} size={56} dir={6} />
            </div>
            <div className="flex flex-col gap-1.5">
                <p className="font-jakarta text-[12px] font-semibold text-ink">
                    Kapsel
                </p>
                <div className="flex gap-1.5">
                    {(["Kort", "Lang", "Krullen"] as const).map((name, i) => (
                        <button
                            key={name}
                            type="button"
                            aria-pressed={look.hairStyle === i}
                            onClick={() => set({ hairStyle: i as HairStyle })}
                            className={cn(
                                "flex-1 rounded-pill border px-2 py-1 font-jakarta text-[12px] font-semibold",
                                look.hairStyle === i
                                    ? "border-blue bg-blue/10 text-blue-aa"
                                    : "border-line text-ink-secondary",
                            )}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>
            <Swatches
                label="Huid"
                colors={PALETTE.skin}
                value={look.skin}
                onChange={(skin) => set({ skin })}
            />
            <Swatches
                label="Haar"
                colors={PALETTE.hair}
                value={look.hair}
                onChange={(hair) => set({ hair })}
            />
            <Swatches
                label="Shirt"
                colors={PALETTE.shirt}
                value={look.shirt}
                onChange={(shirt) => set({ shirt })}
            />
            <Swatches
                label="Broek"
                colors={PALETTE.pants}
                value={look.pants}
                onChange={(pants) => set({ pants })}
            />
            <Swatches
                label="Schoenen"
                colors={PALETTE.shoes}
                value={look.shoes}
                onChange={(shoes) => set({ shoes })}
            />
            <button
                type="button"
                onClick={() => onChange(randomLook())}
                className="rounded-pill border-[1.5px] border-blue py-2 font-jakarta text-label text-blue-aa hover:bg-blue/10"
            >
                🎲 Willekeurig
            </button>
        </div>
    );
}

export function ChatLog({ entries }: { entries: ChatEntry[] }) {
    const end = useRef<HTMLDivElement>(null);
    // Accolades: niets teruggeven. Nieuwere browsers laten scrollIntoView() een Promise teruggeven,
    // en React zou die als opruimfunctie proberen aan te roepen ("destroy is not a function").
    useEffect(() => {
        end.current?.scrollIntoView({ block: "end" });
    }, [entries]);
    return (
        <div className="flex flex-col gap-1.5">
            {entries.map((e) => (
                <p
                    key={e.id}
                    className={cn(
                        "text-[13px] leading-[1.45]",
                        e.system ? "italic text-ink-muted" : "text-ink",
                    )}
                >
                    <span className="mr-1.5 text-[11px] text-ink-muted">
                        {new Date(e.at).toLocaleTimeString("nl-NL", {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </span>
                    {!e.system && (
                        <span
                            className={cn(
                                "font-jakarta font-bold",
                                e.isMe && "text-blue-aa",
                            )}
                        >
                            {e.name}:{" "}
                        </span>
                    )}
                    {e.text}
                </p>
            ))}
            <div ref={end} />
        </div>
    );
}

type InfoStandProps = {
    selection: NonNullable<Selection>;
    onClose: () => void;
    onWave: () => void;
    onUseFurni: (id: string) => void;
    onEditAvatar: () => void;
};

/** Habbo-"infostand": info over de aangeklikte avatar of het aangeklikte meubel. */
export function InfoStand({
    selection: s,
    onClose,
    onWave,
    onUseFurni,
    onEditAvatar,
}: InfoStandProps) {
    const btn =
        "h-9 w-full rounded-pill font-jakarta text-label transition-colors";
    const primary = cn(btn, "bg-blue-aa text-white hover:bg-blue");
    const secondary = cn(
        btn,
        "border-[1.5px] border-blue text-blue-aa hover:bg-blue/10",
    );

    return (
        <aside className="absolute bottom-[132px] right-3 z-20 w-[220px] rounded-card border border-line bg-surface p-3 shadow-card lg:bottom-24 lg:right-4">
            <button
                type="button"
                onClick={onClose}
                aria-label="Sluiten"
                className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-pill text-ink-muted hover:bg-subtle"
            >
                ✕
            </button>
            {s.type === "avatar" ? (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="shrink-0 rounded-tile bg-media-gradient">
                            <AvatarPreview look={s.look} size={40} />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate font-jakarta text-[15px] font-bold text-ink">
                                {s.name}
                            </p>
                            <p className="text-[12px] leading-[1.4] text-ink-secondary">
                                {s.motto}
                            </p>
                        </div>
                    </div>
                    {s.isMe ? (
                        <button
                            type="button"
                            className={secondary}
                            onClick={onEditAvatar}
                        >
                            Avatar aanpassen
                        </button>
                    ) : (
                        <button
                            type="button"
                            className={secondary}
                            onClick={onWave}
                        >
                            Zwaai 👋
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-2 pr-5">
                    <p className="font-jakarta text-[15px] font-bold text-ink">
                        {s.name}
                    </p>
                    <p className="text-[12px] leading-[1.4] text-ink-secondary">
                        {s.description}
                    </p>
                    {s.canSit && (
                        <button
                            type="button"
                            className={primary}
                            onClick={() => onUseFurni(s.id)}
                        >
                            Ga zitten
                        </button>
                    )}
                </div>
            )}
        </aside>
    );
}
