/**
 * Types van de hotel-engine (Habbo/bobba-achtige isometrische kamer).
 * Alles hier is puur frontend: je bent alleen in de kamer.
 */

/**
 * 8 looprichtingen. dx/dy in tegel-coördinaten, zie DIRS in iso.ts.
 * 0 ↗ · 1 → · 2 ↘ · 3 ↓ · 4 ↙ · 5 ← · 6 ↖ · 7 ↑ (zoals op het scherm)
 */
export type Dir = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Tile = { x: number; y: number };

export type HairStyle = 0 | 1 | 2;

export interface AvatarLook {
    skin: string;
    hair: string;
    hairStyle: HairStyle;
    shirt: string;
    pants: string;
    shoes: string;
}

export interface Avatar {
    id: string;
    name: string;
    motto: string;
    look: AvatarLook;
    isMe: boolean;
    /** Tegel waar de avatar staat (of naartoe loopt als `next` gezet is). */
    x: number;
    y: number;
    /** Tegel waar hij nu naartoe stapt; `progress` 0→1. */
    next?: Tile;
    progress: number;
    path: Tile[];
    dir: Dir;
    sitting: boolean;
    dancing: boolean;
    waveUntil: number;
    typingUntil: number;
    /** Sinds wanneer de route geblokkeerd is (iemand staat in de weg). */
    blockedSince?: number;
    /** Andere spelers: laatst geziene zwaai-teller van de server. */
    waveSeq?: number;
}

/** Een andere speler in dezelfde kamer, zoals de server hem doorgeeft. */
export interface RemotePlayer {
    id: number;
    username: string;
    x: number;
    y: number;
    dir: Dir;
    look: AvatarLook;
    sitting: boolean;
    dancing: boolean;
    typing: boolean;
    waves: number;
}

/** Wat de server van jouw eigen avatar moet weten. */
export interface PlayerState {
    x: number;
    y: number;
    dir: Dir;
    sitting: boolean;
    dancing: boolean;
    typing: boolean;
    waves: number;
}

export type FurniKind =
    | "chair"
    | "sofa"
    | "table"
    | "chess"
    | "cardtable"
    | "plant"
    | "lamp"
    | "rug"
    | "counter"
    | "arcade"
    | "stool"
    | "claw"
    | "dancefloor"
    | "racer"
    | "raceseat"
    | "hammer"
    | "airhockey"
    | "neon"
    | "stack"
    | "scoreboard"
    | "waverush"
    | "jetski";

export interface Furni {
    id: string;
    kind: FurniKind;
    x: number;
    y: number;
    /** Alleen 0/2/4/6 zijn zinvol (stoelen/banken: kijkrichting van wie erop zit). */
    dir: Dir;
    /** Grootte in tegels (tapijt, dansvloer; neonbord: breedte langs de muur). */
    w?: number;
    d?: number;
    color?: string;
    /** Tekst op een neonbord of scorebord (scorebord: één regel per \n, pagina's gescheiden door \f). */
    text?: string;
}

export interface RoomDef {
    id: string;
    name: string;
    description: string;
    /**
     * Hoogtekaart, één string per rij (y). 'x' = geen vloer, '0'–'9' = hoogte.
     * Kolom = x. De deur is een tegel die buiten de muur uitsteekt.
     */
    map: string[];
    door: Tile & { dir: Dir };
    colors: {
        floorA: string;
        floorB: string;
        wallLeft: string;
        wallRight: string;
    };
    furni: Furni[];
}

export type Selection =
    | {
          type: "avatar";
          id: string;
          name: string;
          motto: string;
          look: AvatarLook;
          isMe: boolean;
      }
    | {
          type: "furni";
          id: string;
          kind: FurniKind;
          name: string;
          description: string;
          canSit: boolean;
      }
    | null;

export interface ChatEntry {
    id: string;
    name: string;
    text: string;
    at: number;
    isMe?: boolean;
    /** Systeemmelding ("Je bent de kamer binnengekomen"). */
    system?: boolean;
}

export interface EngineEvents {
    onSelect?: (sel: Selection) => void;
    onChat?: (entry: ChatEntry) => void;
    onPeopleChange?: (count: number) => void;
    /** Jij zei iets in de kamer (geen commando) → naar de server sturen. */
    onSay?: (text: string) => void;
    /** Je klikte op een schaakbord → de pagina biedt een partij aan. */
    onChess?: (furniId: string) => void;
    /** Je klikte op de kaarttafel → de pagina biedt een potje Tribekaarten aan. */
    onCards?: (furniId: string) => void;
    /** Je klikte op een arcadekast → de pagina start (straks) een spelletje. */
    onArcade?: (furniId: string) => void;
}
