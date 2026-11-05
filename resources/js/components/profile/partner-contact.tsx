import { icons } from "@/components/tribelink/icons";
import type { ContactDetails } from "@/types";

/**
 * The partner's contact details. Only rendered when the partner shares
 * them with you; the note reminds you not to pass them on (AVG).
 */
export function PartnerContact({
    handle,
    contact,
}: {
    handle: string;
    contact: ContactDetails;
}) {
    const rows = [
        contact.email && {
            label: "E-mail",
            value: contact.email,
            href: `mailto:${contact.email}`,
        },
        contact.phone && {
            label: "Telefoon",
            value: contact.phone,
            href: `tel:${contact.phone.replace(/\s+/g, "")}`,
        },
        contact.socials && { label: "Socials", value: contact.socials },
    ].filter(Boolean) as Array<{ label: string; value: string; href?: string }>;

    return (
        <div className="flex flex-col gap-3">
            {rows.length === 0 ? (
                <p className="type-small text-ink-secondary">
                    {handle} heeft nog geen contactgegevens ingevuld.
                </p>
            ) : (
                <dl className="flex flex-col gap-2">
                    {rows.map(({ label, value, href }) => (
                        <div key={label} className="flex flex-col">
                            <dt className="type-caption text-ink-muted">
                                {label}
                            </dt>
                            <dd className="type-small break-all text-ink">
                                {href ? (
                                    <a
                                        href={href}
                                        className="rounded-sm text-brand-aa underline-offset-2 focus-ring hover:underline"
                                    >
                                        {value}
                                    </a>
                                ) : (
                                    value
                                )}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}
            <p className="flex items-start gap-1.5 type-caption text-ink-muted">
                <img
                    src={icons.lockMuted}
                    alt=""
                    width={8}
                    height={8}
                    className="mt-1"
                />
                Gedeeld met alleen jou. Gebruik deze gegevens alleen om contact
                op te nemen en deel ze niet verder.
            </p>
        </div>
    );
}
