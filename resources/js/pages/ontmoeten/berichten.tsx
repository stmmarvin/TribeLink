import { Head, router, usePage, usePoll } from "@inertiajs/react";
import { useState } from "react";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { BackLink, MobileHeader } from "@/components/tribelink/back-link";
import { PageHeader } from "@/layouts/app-layout";
import { cn } from "@/lib/utils";
import { ontmoeten } from "@/routes";
import { open } from "@/routes/chats";
import { store } from "@/routes/chats/messages";
import type { Contact, Conversation, Message } from "@/types";

const POLL_INTERVAL_MS = 3000;

type Props = {
    conversationId?: string | null;
    conversations?: Conversation[];
    contacts?: Contact[];
    /** Messages of the open conversation. */
    messages?: Message[];
};

/**
 * Chat (not in Figma — designed in the 3.1/3.1b style), opened from the
 * "Berichten" card on Ontmoeten. Desktop: list left, chat right.
 * Mobile: list and conversation are separate views with a back button.
 */
export default function Berichten({
    conversationId = null,
    conversations = [],
    contacts = [],
    messages = [],
}: Props) {
    const { auth } = usePage().props;
    const currentUserId = String(auth.user.id);
    const active =
        conversations.find(
            (conversation) => conversation.id === conversationId,
        ) ?? null;
    const showConversation = conversationId !== null;

    // No realtime yet (no broadcasting set up), so check for new messages
    // every few seconds. Only the chat props are reloaded; Inertia pauses
    // polling while the tab is in the background.
    usePoll(POLL_INTERVAL_MS, {
        only: ["conversations", "contacts", "messages"],
    });

    const [sending, setSending] = useState(false);
    // Kept per conversation, so switching chats doesn't show a stale error.
    const [sendError, setSendError] = useState<{
        conversationId: string;
        message: string;
    } | null>(null);

    const handleSend = (body: string, clear: () => void) => {
        if (!active) {
            return;
        }

        router.post(
            store.url(Number(active.id)),
            { body },
            {
                preserveScroll: true,
                onStart: () => {
                    setSending(true);
                    setSendError(null);
                },
                onSuccess: () => clear(),
                onError: (errors) =>
                    setSendError({
                        conversationId: active.id,
                        message:
                            errors.body ??
                            "Je bericht kon niet worden verstuurd. Probeer het opnieuw.",
                    }),
                onFinish: () => setSending(false),
            },
        );
    };
    const handleStartChat = (contact: Contact) => {
        router.get(open.url(Number(contact.id)));
    };

    return (
        <>
            <Head
                title={active ? `@${active.contact.username}` : "Berichten"}
            />
            <PageHeader title="Berichten" />

            <div className="flex h-[calc(100dvh-68px-env(safe-area-inset-bottom))] min-h-0 flex-col md:gap-4 md:px-10 md:py-6 lg:h-[calc(100dvh-72px)] lg:py-8 xl:px-[72px]">
                <BackLink
                    href={ontmoeten()}
                    className="hidden md:inline-flex"
                />

                <div className="flex min-h-0 flex-1 gap-6">
                    {/* Conversation list — own view on mobile */}
                    <section
                        aria-label="Gesprekken en contacten"
                        className={cn(
                            "min-h-0 min-w-0 flex-col px-5 pt-1 pb-5 md:flex md:w-[300px] md:shrink-0 md:rounded-card md:border md:border-line md:bg-surface md:p-3 md:shadow-card lg:w-[336px]",
                            showConversation
                                ? "hidden"
                                : "flex flex-1 md:flex-none",
                        )}
                    >
                        <MobileHeader
                            title="Berichten"
                            backHref={ontmoeten()}
                            className="mb-3.5 md:hidden"
                        />
                        <ChatSidebar
                            conversations={conversations}
                            contacts={contacts}
                            activeId={conversationId}
                            currentUserId={currentUserId}
                            onStartChat={handleStartChat}
                        />
                    </section>

                    {/* Open conversation — own view on mobile */}
                    <section
                        aria-label="Gesprek"
                        className={cn(
                            "min-h-0 min-w-0 flex-1 flex-col",
                            showConversation ? "flex" : "hidden md:flex",
                        )}
                    >
                        <ChatWindow
                            conversation={active}
                            messages={active ? messages : []}
                            currentUserId={currentUserId}
                            onSend={handleSend}
                            sending={sending}
                            sendError={
                                sendError?.conversationId === active?.id
                                    ? sendError?.message
                                    : null
                            }
                        />
                    </section>
                </div>
            </div>
        </>
    );
}
