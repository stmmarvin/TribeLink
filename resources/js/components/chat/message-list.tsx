import { Fragment, useEffect, useRef } from "react";
import { formatTime, groupMessagesByDay } from "@/lib/chat/format";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/chat";

function DateSeparator({ label }: { label: string }) {
    return (
        <div
            className="flex justify-center"
            role="separator"
            aria-label={label}
        >
            <span className="rounded-full bg-subtle px-2.5 pt-0.5 pb-[3px] type-caption text-ink-secondary md:bg-transparent md:p-0 md:leading-[18px] md:text-ink-muted">
                {label}
            </span>
        </div>
    );
}

function MessageBubble({
    message,
    own,
    showTime,
    contactName,
}: {
    message: Message;
    own: boolean;
    showTime: boolean;
    contactName: string;
}) {
    return (
        <div
            className={cn(
                "flex flex-col gap-1",
                own ? "items-end" : "items-start",
            )}
        >
            <p className="sr-only">{own ? "Jij:" : `@${contactName}:`}</p>
            <div
                className={cn(
                    "max-w-[261px] px-3 py-[9px] type-small break-words whitespace-pre-wrap md:max-w-[70%]",
                    own
                        ? "rounded-t-[18px] rounded-br-[6px] rounded-bl-[18px] bg-cta-from text-white md:bg-brand-aa"
                        : "rounded-t-[18px] rounded-br-[18px] rounded-bl-[6px] border border-line bg-surface text-ink shadow-card",
                )}
            >
                {message.body}
            </div>
            {showTime && (
                <time
                    dateTime={message.sentAt}
                    className="px-1 type-caption leading-4 text-ink-muted"
                >
                    {formatTime(message.sentAt)}
                </time>
            )}
        </div>
    );
}

/**
 * Scrollable message log; always scrolls to the newest message.
 * `showMeta={false}` hides date separators and times (Random chat, 2.4).
 */
export function MessageList({
    messages,
    currentUserId,
    contactName,
    loading,
    showMeta = true,
    className,
}: {
    messages: Message[];
    currentUserId: string;
    contactName: string;
    loading: boolean;
    showMeta?: boolean;
    className?: string;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastMessageId = messages.at(-1)?.id;

    useEffect(() => {
        const element = scrollRef.current;

        if (element) {
            element.scrollTo({ top: element.scrollHeight });
        }
    }, [lastMessageId]);

    const groups = groupMessagesByDay(messages);

    return (
        <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-label="Berichten"
            tabIndex={0}
            className={cn(
                "min-h-0 flex-1 overflow-y-auto focus-visible:outline-none",
                className,
            )}
        >
            <div className="flex min-h-full flex-col justify-end gap-2 py-1 md:gap-2.5 md:p-5">
                {loading ? (
                    <p className="text-center type-small text-ink-muted">
                        Berichten laden…
                    </p>
                ) : messages.length === 0 ? (
                    <p className="text-center type-small text-ink-muted">
                        Nog geen berichten. Zeg hoi!
                    </p>
                ) : (
                    groups.map((group) => (
                        <Fragment key={group.key}>
                            {showMeta && <DateSeparator label={group.label} />}
                            {group.messages.map((message, index) => {
                                const next = group.messages[index + 1];

                                return (
                                    <MessageBubble
                                        key={message.id}
                                        message={message}
                                        own={message.senderId === currentUserId}
                                        contactName={contactName}
                                        // Time under the last bubble of each run.
                                        showTime={
                                            showMeta &&
                                            (!next ||
                                                next.senderId !==
                                                    message.senderId)
                                        }
                                    />
                                );
                            })}
                        </Fragment>
                    ))
                )}
            </div>
        </div>
    );
}
