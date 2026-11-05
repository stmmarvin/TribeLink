import type { ChatUser, ContactStatus } from "./chat";

/**
 * The six profile parts you can share with one person (Figma 3.3
 * "Profiel delen"). `contact` is always the last step: it can only be
 * shared once the other five are shared.
 */
export type ShareItemKey =
    "avatar" | "banner" | "bio" | "fun_fact" | "real_name" | "contact";

export type ShareSettings = Record<ShareItemKey, boolean>;

/** Contact details a user fills in on "Profiel bewerken". */
export type ContactDetails = {
    email?: string | null;
    phone?: string | null;
    socials?: string | null;
};

/**
 * The partner's profile parts. The backend only fills in the parts the
 * partner shares with the current user; the rest stays null.
 */
export type PartnerProfile = {
    bannerUrl?: string | null;
    bio?: string | null;
    funFact?: string | null;
    realName?: string | null;
};

/** Props of the "Profiel delen" page, as the backend will send them. */
export type ProfileShareProps = {
    partner: ChatUser & { status: ContactStatus };
    /** What the current user shares with the partner. */
    mine: ShareSettings;
    /** What the partner shares with the current user. */
    theirs: ShareSettings;
    /**
     * The partner's contact details. The backend only sends these when the
     * partner shares their full profile (6 of 6) with the current user.
     */
    partnerContact: ContactDetails | null;
    partnerProfile: PartnerProfile | null;
};

/** Props of the partner's profile page (Figma 3.4 "Profiel – deels zichtbaar"). */
export type PartnerProfilePageProps = Pick<
    ProfileShareProps,
    "partner" | "theirs" | "partnerProfile" | "partnerContact"
>;
