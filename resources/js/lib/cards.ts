import type {
    CardCode,
    CardColor,
    CardDifficulty,
    CardHouseRule,
    CardValue,
} from "@/types";

/**
 * Tribekaarten: the four colours. Every colour also has its own shape and
 * background pattern, so the cards can be told apart without seeing colour.
 */
export const CARD_COLORS: Record<
    CardColor,
    { name: string; fill: string; dark: string; light: string }
> = {
    sun: { name: "Zon", fill: "#FFB627", dark: "#8A5A00", light: "#FFE3A3" },
    sea: { name: "Zee", fill: "#2F6BFF", dark: "#173C99", light: "#B9CEFF" },
    leaf: { name: "Blad", fill: "#22A559", dark: "#0F5E31", light: "#B5EBCB" },
    fire: { name: "Vuur", fill: "#E84A3A", dark: "#8C1D12", light: "#FFC2BA" },
};

export const COLOR_ORDER: CardColor[] = ["sun", "sea", "leaf", "fire"];

export const DIFFICULTY_LABELS: Record<CardDifficulty, string> = {
    easy: "Makkelijk",
    normal: "Normaal",
    hard: "Moeilijk",
};

/** Same texts as config/cards.php. */
export const HOUSE_RULES: Record<
    CardHouseRule,
    { label: string; description: string }
> = {
    stacking: {
        label: "+2 en +4 stapelen",
        description:
            "Leg een +2 op een +2 (of een +4 op een +2 of +4): de volgende pakt alles samen.",
    },
    zero_seven: {
        label: "0/7-regel",
        description:
            "Een 0 schuift alle handen door, met een 7 ruil je je hand met een tegenstander.",
    },
};

export const cardColor = (card: CardCode) =>
    card.split(":")[0] as CardColor | "wild";

export const cardValue = (card: CardCode) => card.split(":")[1] as CardValue;

export const isWild = (card: CardCode) => cardColor(card) === "wild";

const VALUE_NAMES: Partial<Record<CardValue, string>> = {
    skip: "beurt overslaan",
    reverse: "richting omdraaien",
    draw2: "pak twee",
    wild: "kleurwissel",
    wild4: "kleurwissel pak vier",
};

/** For screen readers: "Zon 7", "Zee beurt overslaan", "kleurwissel pak vier". */
export function cardLabel(card: CardCode): string {
    const color = cardColor(card);
    const value = cardValue(card);
    const name = VALUE_NAMES[value] ?? value;

    return color === "wild" ? name : `${CARD_COLORS[color].name} ${name}`;
}

const VALUE_ORDER: CardValue[] = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "skip",
    "reverse",
    "draw2",
    "wild",
    "wild4",
];

/** Your hand sorted by colour, then value; colour changes at the end. */
export function sortHand(hand: CardCode[]): CardCode[] {
    const rank = (card: CardCode) => {
        const color = cardColor(card);

        return (
            (color === "wild" ? 4 : COLOR_ORDER.indexOf(color)) * 100 +
            VALUE_ORDER.indexOf(cardValue(card))
        );
    };

    return [...hand].sort((a, b) => rank(a) - rank(b));
}

/**
 * SVG path of a pixel sprite ('#' = pixel), drawn with its top-left corner
 * at (x, y), one unit per pixel.
 */
export function spritePath(rows: string[], x = 0, y = 0): string {
    let d = "";

    rows.forEach((row, dy) =>
        row.split("").forEach((pixel, dx) => {
            if (pixel === "#") {
                d += `M${x + dx} ${y + dy}h1v1h-1z`;
            }
        }),
    );

    return d;
}
