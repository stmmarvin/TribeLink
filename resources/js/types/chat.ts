/**
 * Relationship status between the current user and a contact
 * (Figma 3.1 legend):
 * - saved   "Bewaard"          – not met in real life yet
 * - partial "Deels zichtbaar"  – met, profile partly shared
 * - friend  "Vriend"           – everything shared both ways
 */
export type ContactStatus = "saved" | "partial" | "friend";

export type ChatUser = {
    id: string;
    username: string;
    avatarUrl?: string | null;
};

/** Someone the user has saved or befriended. */
export type Contact = ChatUser & {
    status: ContactStatus;
    /** Optional second line, e.g. the last message or a short bio. */
    subtitle?: string | null;
};

export type Message = {
    id: string;
    conversationId: string;
    senderId: string;
    body: string;
    /** ISO 8601 timestamp. */
    sentAt: string;
};

export type Conversation = {
    id: string;
    contact: ChatUser;
    status: ContactStatus;
    unreadCount: number;
    lastMessage: Message | null;
};
