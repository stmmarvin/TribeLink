import { Composer } from "@/components/chat/composer";
import { MessageList } from "@/components/chat/message-list";
import { Avatar } from "@/components/tribelink/avatar";
import { MobileHeader } from "@/components/tribelink/back-link";
import { Button } from "@/components/tribelink/button";
import { cn } from "@/lib/utils";
import type { Message, RandomChatPartner } from "@/types";
import { ReconnectingNotice, ReportButton, SaveButton } from "./chat-actions";

/**
 * Figma 2.4 "Random chat – gesprek" (+ 2.4b while reconnecting).
 * Mobile: header, action row, hint, messages, composer.
 * Desktop: the same inside one card with the actions in the chat header.
 */
export function ChatPanel({
    partner,
    messages,
    saved,
    reconnecting,
    sending,
    sendError,
    onSend,
    onSave,
    onSkip,
    onLeave,
    onReport,
}: {
    partner: RandomChatPartner;
    messages: Message[];
    saved: boolean;
    reconnecting: boolean;
    sending: boolean;
    sendError: string | null;
    onSend: (body: string, clear: () => void) => void;
    onSave: () => Promise<void>;
    onSkip: () => void;
    onLeave: () => void;
    onReport: () => void;
}) {
    // Figma 2.4b dims the conversation on mobile while reconnecting.
    const dim = reconnecting && "max-md:opacity-35";
    const username = partner.username;

    return (
        <div className="relative flex min-h-0 flex-1 flex-col gap-3.5 md:gap-0 md:rounded-card md:border md:border-line md:bg-surface md:shadow-card">
            {/* Mobile header (Figma 2.4 mobile) */}
            <MobileHeader
                title={
                    <span className="text-sm leading-[19.6px]">
                        @{username}
                    </span>
                }
                onBack={onLeave}
                action={
                    <ReportButton
                        username={username}
                        onClick={onReport}
                        disabled={reconnecting}
                        className="-mr-1.5"
                    />
                }
                className={cn("md:hidden", dim)}
            >
                <span className="type-small text-ink-secondary">
                    Random chat · anoniem
                </span>
            </MobileHeader>

            {/* Mobile actions: Bewaren · Volgende · Verlaten */}
            <div className={cn("grid grid-cols-3 gap-2 md:hidden", dim)}>
                <SaveButton
                    saved={saved}
                    onSave={onSave}
                    size="sm"
                    disabled={reconnecting}
                    className="h-[38px] px-2"
                />
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={onSkip}
                    disabled={reconnecting}
                    className="h-[38px] px-2"
                >
                    Volgende
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={onLeave}
                    disabled={reconnecting}
                    className="h-[38px] px-2"
                >
                    Verlaten
                </Button>
            </div>

            {/* Desktop chat header (Figma "Chat header") */}
            <div className="hidden items-center gap-3 border-b border-line px-5 py-3.5 md:flex">
                <Avatar name={username} size={40} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[18px]">
                    <h2 className="truncate font-display text-sm font-bold text-ink">
                        @{username}
                    </h2>
                    <span className="type-caption leading-[18px] text-ink-muted">
                        Random chat · anoniem
                    </span>
                </div>
                <SaveButton
                    saved={saved}
                    onSave={onSave}
                    variant="secondary"
                    size="sm"
                    disabled={reconnecting}
                    className="min-w-[110px]"
                />
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={onSkip}
                    disabled={reconnecting}
                >
                    Volgende chat
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLeave}
                    disabled={reconnecting}
                >
                    Chat verlaten
                </Button>
                <ReportButton
                    username={username}
                    onClick={onReport}
                    disabled={reconnecting}
                />
            </div>

            <div className="flex flex-col items-center gap-2.5 md:px-5 md:pt-5">
                {reconnecting && <ReconnectingNotice />}
                <p
                    className={cn(
                        "rounded-full bg-subtle px-2.5 pt-0.5 pb-[3px] text-center type-caption text-ink-secondary",
                        dim,
                    )}
                >
                    Je ziet alleen de gebruikersnaam van de ander.
                </p>
            </div>

            <MessageList
                messages={messages}
                currentUserId="me"
                contactName={username}
                loading={false}
                showMeta={false}
                className={cn(dim || undefined)}
            />

            <div className="md:border-t md:border-line md:p-4">
                <Composer
                    onSend={onSend}
                    sending={sending}
                    error={sendError}
                    disabled={reconnecting}
                />
            </div>
        </div>
    );
}
