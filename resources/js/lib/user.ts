import type { User } from "@/types";

/**
 * Keeps a safe fallback for legacy API payloads while new users always have
 * a persisted username.
 */
export function usernameFor(user: Pick<User, "name"> & { username?: unknown }) {
    if (typeof user.username === "string" && user.username) {
        return user.username;
    }

    return user.name.trim().split(/\s+/)[0] ?? user.name;
}
