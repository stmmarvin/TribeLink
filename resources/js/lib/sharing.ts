import type {
    ContactStatus,
    ProfileShareProps,
    ShareItemKey,
    ShareSettings,
} from "@/types";

/** The six profile parts you can share (Figma 3.3 / 3.4). */
export const shareItems: Array<{ key: ShareItemKey; label: string }> = [
    { key: "avatar", label: "Profielfoto" },
    { key: "banner", label: "Banner" },
    { key: "bio", label: "Bio" },
    { key: "fun_fact", label: "Leuk weetje" },
    { key: "real_name", label: "Echte naam" },
    { key: "contact", label: "Contactgegevens" },
];

export const shareTotal = shareItems.length;

// Privacy by default (AVG): nothing is shared until the user turns it on.
export const nothingShared: ShareSettings = {
    avatar: false,
    banner: false,
    bio: false,
    fun_fact: false,
    real_name: false,
    contact: false,
};

export const countShared = (settings: ShareSettings) =>
    shareItems.filter(({ key }) => settings[key]).length;

const statuses: ContactStatus[] = ["saved", "partial", "friend"];

/**
 * Until the backend sends `partner`, the pages read it from the URL:
 * ?user=5&username=sanne&status=friend (or the id from /profile/5).
 * Display only: the backend must check what is shared before sending data.
 */
export function partnerFromUrl(
    url: string,
    id?: string,
): ProfileShareProps["partner"] {
    const query = new URLSearchParams(url.split("?")[1] ?? "");
    const status = query.get("status") as ContactStatus | null;

    return {
        id: id ?? query.get("user") ?? "",
        username: query.get("username") || "……",
        avatarUrl: null,
        status: status && statuses.includes(status) ? status : "partial",
    };
}

/** Query string that carries the partner to the other page (fallback only). */
export function partnerQuery(partner: ProfileShareProps["partner"]) {
    return new URLSearchParams({
        username: partner.username,
        status: partner.status,
    }).toString();
}
