import type { ChatUser } from "./chat";

export type Visibility = "public" | "friends";

export type Post = {
    id: string;
    author: ChatUser;
    body: string;
    imageUrl?: string | null;
    /** ISO 8601 timestamp. */
    createdAt: string;
    commentCount: number;
    likeCount?: number;
    likedByViewer?: boolean;
    comments?: PostComment[];
    /** Who can see the post: everyone, or only friends. */
    visibility: Visibility;
    /** Your own post: the feed shows edit and delete buttons. */
    isOwn?: boolean;
};

export type PostComment = {
    id: string;
    author: ChatUser;
    body: string;
    createdAt: string;
    visibility: Visibility;
};

/** A lobby room (Figma "Lobby · 4 ruimtes"). */
export type Room = {
    id: string;
    name: string;
    /** `null` while the occupancy is unknown. */
    peopleCount: number | null;
    imageUrl?: string | null;
};
