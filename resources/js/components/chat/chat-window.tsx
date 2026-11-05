import { Avatar } from "@/components/tribelink/avatar";
import { MobileHeader } from "@/components/tribelink/back-link";
import { Chip } from "@/components/tribelink/chip";
import { EmptyState } from "@/components/tribelink/empty-state";
import { icons } from "@/components/tribelink/icons";
import { statusLabels } from "@/lib/chat/format";
import { index as berichten } from "@/routes/chats";
import type { ContactStatus, Conversation, Message } from "@/types";
import { Composer } from "./composer";
import { MessageList } from "./message-list";

const statusDescriptions: Record<ContactStatus, string> = {
    saved: "Bewaard contact",
    partial: "Profiel deels zichtbaar",
    friend: "Vriend",
};

/**
 * The open conversation (header, messages, composer). Sending is delegated
 * to `onSend`; the page posts it and reports `sending` / `sendError` back.
 */
export function ChatWindow({
    conversation,
    messages,
    currentUserId,
    onSend,
    sending = false,
    sendError = null,
}: {
    conversation: Conversation | null;
    messages: Message[];
    currentUserId: string;
    onSend: (message: string, clear: () => void) => void;
    sending?: boolean;
    sendError?: string | null;
}) {
    if (!conversation) {
        return (
            <div className="flex flex-1 flex-col md:rounded-card md:border md:border-line md:bg-surface md:shadow-card">
                {/* Only visible on mobile, where this is a separate view. */}
                <MobileHeader
                    title="Gesprek"
                    backHref={berichten()}
                    className="px-5 pt-1 md:hidden"
                />
                <EmptyState
                    icon={{ src: icons.menuUsers, size: 20 }}
                    title="Selecteer een gesprek om te beginnen"
                    text="Kies een gesprek of start een chat vanuit je contacten."
                    className="flex-1"
                />
            </div>
        );
    }

    const { contact, status } = conversation;

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3.5 px-5 pt-1 pb-5 md:gap-0 md:rounded-card md:border md:border-line md:bg-surface md:p-0 md:shadow-card">
            {/* Mobile header with back button (Figma 3.1b mobile) */}
            <MobileHeader
                title={
                    <span className="text-sm leading-[19.6px]">
                        @{contact.username}
                    </span>
                }
                backHref={berichten()}
                className="md:hidden"
            >
                <Chip variant={status}>{statusLabels[status]}</Chip>
            </MobileHeader>

            {/* Desktop header (Figma "Chat header") */}
            <div className="hidden items-center gap-3 border-b border-line px-5 py-3.5 md:flex">
                <Avatar
                    name={contact.username}
                    src={contact.avatarUrl}
                    size={40}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[18px]">
                    <h3 className="truncate font-display text-sm font-bold text-ink">
                        @{contact.username}
                    </h3>
                    <span className="type-caption leading-[18px] text-ink-muted">
                        {statusDescriptions[status]}
                    </span>
                </div>
                <Chip variant={status}>{statusLabels[status]}</Chip>
            </div>

            <MessageList
                messages={messages}
                currentUserId={currentUserId}
                contactName={contact.username}
                loading={false}
            />

            <div className="md:border-t md:border-line md:p-4">
                <Composer
                    key={conversation.id}
                    onSend={onSend}
                    sending={sending}
                    error={sendError}
                />
            </div>
        </div>
    );
}
