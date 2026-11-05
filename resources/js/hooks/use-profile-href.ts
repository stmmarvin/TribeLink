import { usePage } from "@inertiajs/react";
import { show as showProfile } from "@/routes/profile";

/**
 * Link to someone's profile: your own profile page for yourself,
 * the public poster for everyone else.
 */
export function useProfileHref() {
    const { auth } = usePage().props;

    return (userId: string | number) =>
        String(userId) === String(auth.user.id)
            ? showProfile()
            : `/profile/${userId}/poster`;
}
