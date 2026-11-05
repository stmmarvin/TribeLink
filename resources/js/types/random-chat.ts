import type { Message } from "./chat";

/** The anonymous partner: only the username is shared (Figma 2.4). */
export type RandomChatPartner = {
    id: string;
    username: string;
};

export type ReportReason = "spam" | "inappropriate" | "harassment" | "other";

export type RandomChatReport = {
    reason: ReportReason;
    details?: string;
};

/** Why the chat ended (shown on the "Chat beëindigd" screen). */
export type RandomChatEndReason = "partner-left" | "reported";

/**
 * Random chat state from RandomChatController (prop `randomChat`):
 * idle → searching → chatting → ended. The page polls it while searching or
 * chatting. Own messages have senderId "me".
 */
export type RandomChatSession = {
    status: "idle" | "searching" | "chatting" | "ended";
    /** Students searching or chatting right now. */
    onlineCount: number;
    chat: {
        id: string;
        partner: RandomChatPartner;
        /** You saved the partner as a contact ("Bewaren"). */
        saved: boolean;
        endReason: RandomChatEndReason | null;
    } | null;
    messages: Message[];
};
