import { Link } from "@inertiajs/react";
import { useState } from "react";
import { Avatar } from "@/components/tribelink/avatar";
import { Button } from "@/components/tribelink/button";
import { Chip } from "@/components/tribelink/chip";
import { EmptyState } from "@/components/tribelink/empty-state";
import { icons } from "@/components/tribelink/icons";
import { inputClasses } from "@/components/tribelink/input";
import { SegmentedTabs } from "@/components/tribelink/tabs";
import { formatListTimestamp, statusLabels } from "@/lib/chat/format";
import { cn } from "@/lib/utils";
import { show } from "@/routes/chats";
import type { Contact, Conversation } from "@/types";

type Tab = "gesprekken" | "contacten";

function UnreadBadge({ count }: { count: number }) {
    if (count <= 0) {
        return null;
    }

    return (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-aa px-1.5 font-display text-xs leading-none font-bold text-white">
            {count > 9 ? "9+" : count}
            <span className="sr-only"> ongelezen</span>
        </span>
    );
}

const rowClasses =
    "flex items-center gap-3 rounded-card border border-line bg-surface py-1.5 pr-2 shadow-card transition-colors md:gap-2.5 md:rounded-field md:border-0 md:px-3 md:py-2.5 md:shadow-none";

function ConversationItem({
    conversation,
    active,
    currentUserId,
}: {
    conversation: Conversation;
    active: boolean;
    currentUserId: string;
}) {
    const { contact, lastMessage, unreadCount, status } = conversation;
    const preview = lastMessage
        ? `${lastMessage.senderId === currentUserId ? "Jij: " : ""}${lastMessage.body}`
        : "Nog geen berichten";

    return (
        <Link
            href={show(Number(conversation.id))}
            preserveScroll
            aria-current={active ? "page" : undefined}
            className={cn(
                rowClasses,
                "focus-ring",
                active
                    ? "md:bg-brand/10"
                    : "hover:border-brand active:bg-subtle md:hover:bg-subtle md:active:bg-brand/10",
            )}
        >
            <Avatar name={contact.username} src={contact.avatarUrl} size={40} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[18px]">
                <span className="flex items-center gap-2">
                    <span className="truncate font-display text-sm font-bold text-ink">
                        @{contact.username}
                    </span>
                    {lastMessage && (
                        <time
                            dateTime={lastMessage.sentAt}
                            className="ml-auto shrink-0 type-caption leading-[18px] text-ink-muted"
                        >
                            {formatListTimestamp(lastMessage.sentAt)}
                        </time>
                    )}
                </span>
                <span
                    className={cn(
                        "truncate type-caption leading-[18px]",
                        unreadCount > 0
                            ? "font-medium text-ink"
                            : "text-ink-secondary md:text-ink-muted",
                    )}
                >
                    {preview}
                </span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
                <Chip variant={status}>{statusLabels[status]}</Chip>
                <UnreadBadge count={unreadCount} />
            </div>
        </Link>
    );
}

function ContactItem({
    contact,
    onStartChat,
}: {
    contact: Contact;
    onStartChat: (contact: Contact) => void;
}) {
    return (
        <div className={rowClasses}>
            <Avatar name={contact.username} src={contact.avatarUrl} size={40} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[18px]">
                <span className="truncate font-display text-sm font-bold text-ink">
                    @{contact.username}
                </span>
                <span className="truncate type-caption leading-[18px] text-ink-muted">
                    {statusLabels[contact.status]}
                </span>
            </div>
            <Button
                variant="secondary"
                size="sm"
                onClick={() => onStartChat(contact)}
                aria-label={`Chat starten met @${contact.username}`}
            >
                Chat
            </Button>
        </div>
    );
}

/**
 * Left column of the Ontmoeten chat: search + tabs for conversations and
 * contacts. Tabs were chosen over two stacked sections because the design
 * system already uses segmented tabs elsewhere and both lists
 * share the same narrow column — stacked, the conversations would be pushed
 * out of view by the contacts.
 */
export function ChatSidebar({
    conversations,
    contacts,
    activeId,
    currentUserId,
    onStartChat,
}: {
    conversations: Conversation[];
    contacts: Contact[];
    activeId: string | null;
    currentUserId: string;
    onStartChat: (contact: Contact) => void;
}) {
    const [tab, setTab] = useState<Tab>("gesprekken");
    const [query, setQuery] = useState("");
    const needle = query.trim().toLowerCase();

    const shownConversations = needle
        ? conversations.filter(
              (conversation) =>
                  conversation.contact.username
                      .toLowerCase()
                      .includes(needle) ||
                  conversation.lastMessage?.body.toLowerCase().includes(needle),
          )
        : conversations;
    const shownContacts = needle
        ? contacts.filter((contact) =>
              contact.username.toLowerCase().includes(needle),
          )
        : contacts;

    const placeholder =
        tab === "gesprekken" ? "Zoek in gesprekken" : "Zoek in contacten";

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3.5 md:gap-2">
            <SegmentedTabs<Tab>
                idPrefix="chat"
                label="Gesprekken of contacten"
                value={tab}
                onChange={setTab}
                fullWidth
                tabs={[
                    {
                        value: "gesprekken",
                        label: `Gesprekken (${conversations.length})`,
                    },
                    {
                        value: "contacten",
                        label: `Contacten (${contacts.length})`,
                    },
                ]}
            />

            <div role="search">
                <label htmlFor="chat-search" className="sr-only">
                    {placeholder}
                </label>
                <input
                    id="chat-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={placeholder}
                    autoComplete="off"
                    className={inputClasses}
                />
            </div>

            <div
                role="tabpanel"
                id={`chat-panel-${tab}`}
                aria-labelledby={`chat-tab-${tab}`}
                className="-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1 py-1"
            >
                {tab === "gesprekken" ? (
                    shownConversations.length === 0 ? (
                        <EmptyState
                            icon={{ src: icons.menuUsers, size: 20 }}
                            title={
                                needle
                                    ? "Geen gesprekken gevonden"
                                    : "Nog geen gesprekken"
                            }
                            text={
                                needle
                                    ? `Niets gevonden voor “${query}”.`
                                    : "Start een chat vanuit je contacten."
                            }
                        />
                    ) : (
                        <ul
                            aria-label="Gesprekken"
                            className="flex flex-col gap-3.5 md:gap-1"
                        >
                            {shownConversations.map((conversation) => (
                                <li key={conversation.id}>
                                    <ConversationItem
                                        conversation={conversation}
                                        active={conversation.id === activeId}
                                        currentUserId={currentUserId}
                                    />
                                </li>
                            ))}
                        </ul>
                    )
                ) : shownContacts.length === 0 ? (
                    <EmptyState
                        icon={{ src: icons.menuUser, size: 20 }}
                        title={
                            needle
                                ? "Geen contacten gevonden"
                                : "Je hebt nog geen contacten"
                        }
                        text={
                            needle
                                ? `Niets gevonden voor “${query}”.`
                                : "Bewaar iemand na een random chat, brief of lobby."
                        }
                    />
                ) : (
                    <ul
                        aria-label="Contacten"
                        className="flex flex-col gap-3.5 md:gap-1"
                    >
                        {shownContacts.map((contact) => (
                            <li key={contact.id}>
                                <ContactItem
                                    contact={contact}
                                    onStartChat={onStartChat}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
