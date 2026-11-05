// Client-side validation for the auth/profile forms. The server stays the
// source of truth; these checks only give instant feedback in Dutch.

export const HU_MAIL_DOMAIN = "@student.hu.nl";

type PasswordPolicy = {
    minLength: number;
    lower: boolean;
    upper: boolean;
    digit: boolean;
    special: boolean;
};

/**
 * Parses Laravel's `Password::defaults()->toPasswordRulesString()`, e.g.
 * "minlength: 12; required: lower; required: upper; required: digit; required: special;".
 */
export function parsePasswordRules(rules?: string): PasswordPolicy {
    const policy: PasswordPolicy = {
        minLength: 8,
        lower: false,
        upper: false,
        digit: false,
        special: false,
    };

    for (const part of (rules ?? "").split(";")) {
        const [key, rawValue] = part.split(":").map((value) => value.trim());

        if (key === "minlength" && rawValue) {
            policy.minLength = Number(rawValue) || policy.minLength;
        }

        if (key === "required") {
            for (const value of rawValue?.split(",") ?? []) {
                const kind = value.trim();

                if (kind === "lower" || kind === "upper" || kind === "digit") {
                    policy[kind] = true;
                }

                if (kind === "special") {
                    policy.special = true;
                }
            }
        }
    }

    return policy;
}

export function validatePassword(
    password: string,
    rules?: string,
): string | undefined {
    const policy = parsePasswordRules(rules);

    if (!password) {
        return "Vul een wachtwoord in.";
    }

    if (password.length < policy.minLength) {
        return `Gebruik minimaal ${policy.minLength} tekens.`;
    }

    if (policy.lower && !/[a-z]/.test(password)) {
        return "Gebruik minimaal één kleine letter.";
    }

    if (policy.upper && !/[A-Z]/.test(password)) {
        return "Gebruik minimaal één hoofdletter.";
    }

    if (policy.digit && !/\d/.test(password)) {
        return "Gebruik minimaal één cijfer.";
    }

    if (policy.special && !/[^A-Za-z0-9]/.test(password)) {
        return "Gebruik minimaal één symbool.";
    }

    return undefined;
}

export function validateConfirmation(
    password: string,
    confirmation: string,
): string | undefined {
    if (!confirmation) {
        return "Herhaal je wachtwoord.";
    }

    return password === confirmation
        ? undefined
        : "De wachtwoorden komen niet overeen.";
}

export function validateName(name: string): string | undefined {
    return name.trim() ? undefined : "Vul je echte naam in.";
}

export function validateUsername(username: string): string | undefined {
    if (!username.trim()) {
        return "Kies een gebruikersnaam.";
    }

    if (!/^[A-Za-z0-9_]+$/.test(username)) {
        return "Geen symbolen toegestaan. Gebruik letters, cijfers en _.";
    }

    if (username.length < 3) {
        return "Gebruik minimaal 3 tekens.";
    }

    return undefined;
}

export function validateHuMail(email: string): string | undefined {
    const value = email.trim().toLowerCase();

    if (!value) {
        return "Vul je HU-mail in.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return "Vul een geldig e-mailadres in.";
    }

    if (!value.endsWith(HU_MAIL_DOMAIN)) {
        return `Gebruik je HU-mail die eindigt op ${HU_MAIL_DOMAIN}.`;
    }

    return undefined;
}

/** Keeps only the errors of fields the user has interacted with. */
export function visibleErrors<T extends string>(
    errors: Partial<Record<T, string>>,
    touched: Partial<Record<T, boolean>>,
): Partial<Record<T, string>> {
    return Object.fromEntries(
        Object.entries(errors).filter(
            ([field, message]) => message && touched[field as T],
        ),
    ) as Partial<Record<T, string>>;
}
