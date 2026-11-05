import type { AvatarLook, Furni, HairStyle, RoomDef } from "./types";

let n = 0;
const f = (
    kind: Furni["kind"],
    x: number,
    y: number,
    dir: Furni["dir"] = 2,
    extra: Partial<Furni> = {},
): Furni => ({
    id: `f${++n}`,
    kind,
    x,
    y,
    dir,
    ...extra,
});

/** Tafel met vier stoelen eromheen (kijken allemaal naar de tafel). */
const tableSet = (x: number, y: number, color?: string): Furni[] => [
    f("table", x, y),
    f("chair", x - 1, y, 2, { color }),
    f("chair", x + 1, y, 6, { color }),
    f("chair", x, y - 1, 4, { color }),
    f("chair", x, y + 1, 0, { color }),
];

/**
 * Spelhoek: schaakbord met twee stoelen tegenover elkaar. Het bord krijgt een
 * vaste id: daarmee zoekt de server (ChessController) per bord een tegenstander.
 */
const chessSet = (x: number, y: number, id: string): Furni[] => [
    f("chess", x, y, 2, { id }),
    f("chair", x - 1, y, 2, { color: "#14B8A6" }),
    f("chair", x + 1, y, 6, { color: "#14B8A6" }),
];

/**
 * Kaarttafel met vier stoelen (Tribekaarten, 2–4 spelers). Vaste id: daarmee
 * zoekt de server (CardGameController) per tafel medespelers.
 */
const cardTableSet = (x: number, y: number, id: string): Furni[] => [
    f("cardtable", x, y, 2, { id }),
    f("chair", x - 1, y, 2, { color: "#7C5CFF" }),
    f("chair", x + 1, y, 6, { color: "#7C5CFF" }),
    f("chair", x, y - 1, 4, { color: "#7C5CFF" }),
    f("chair", x, y + 1, 0, { color: "#7C5CFF" }),
];

/**
 * Arcadekast met een kruk ervoor. Scherm naar voren (dir 4) → kruk eronder, of
 * naar rechts (dir 2) → kruk ernaast. Vaste id: daar haken de arcadespellen straks aan.
 */
const arcadeSet = (
    x: number,
    y: number,
    dir: 2 | 4,
    id: string,
    color: string,
): Furni[] => [
    f("arcade", x, y, dir, { id, color }),
    dir === 4
        ? f("stool", x, y + 1, 0, { color })
        : f("stool", x + 1, y, 6, { color }),
];

/** Racekast met de racestoel ervoor (je kijkt naar het scherm). */
const racerSet = (x: number, y: number, id: string, color: string): Furni[] => [
    f("racer", x, y, 4, { id, color }),
    f("raceseat", x, y + 1, 0, { color }),
];

/**
 * Kamers. Kies er een met ?kamer=<id> in de URL (standaard de eerste).
 * Hoogtekaart: 'x' = geen vloer, cijfer = hoogte. De deur steekt aan de linkerkant uit de muur.
 */
export const ROOMS: RoomDef[] = [
    {
        id: "kantine",
        name: "Kantine",
        description: "",
        map: [
            "x000000000000",
            "x000000000000",
            "x000000000000",
            "x000000000000",
            "0000000000000",
            "x000000000000",
            "x000000000000",
            "x000000000000",
            "x000000000000",
            "x000000000000",
        ],
        door: { x: 0, y: 4, dir: 2 },
        colors: {
            floorA: "#F5F9FF",
            floorB: "#EAF2FF",
            wallLeft: "#C8DBFF",
            wallRight: "#A9C3F5",
        },
        furni: [
            ...tableSet(3, 2),
            ...tableSet(3, 7),
            ...tableSet(7, 7, "#FFB627"),
            ...chessSet(10, 6, "schaakbord-1"),
            ...cardTableSet(10, 3, "kaarttafel-1"),
            f("rug", 5, 3, 2, { w: 4, d: 3, color: "#22D3EE" }),
            f("counter", 8, 0),
            f("counter", 9, 0),
            f("counter", 10, 0),
            f("counter", 11, 0),
            f("plant", 1, 0),
            f("plant", 12, 9),
            f("plant", 12, 0),
            f("lamp", 1, 9, 2, { color: "#FFB627" }),
        ],
    },
    {
        id: "spelletjeshoek",
        name: "Spelletjeshoek",
        description: "Arcadekasten op het podium en schaakborden.",
        map: [
            "x00001111111",
            "x00001111111",
            "x00001111111",
            "x00000000000",
            "x00000000000",
            "000000000000",
            "x00000000000",
            "x00000000000",
            "x00000000000",
            "x00000000000",
        ],
        door: { x: 0, y: 5, dir: 2 },
        colors: {
            floorA: "#E9FBF8",
            floorB: "#D3F4EF",
            wallLeft: "#B9EEE8",
            wallRight: "#93DCD2",
        },
        furni: [
            f("arcade", 6, 0, 4, { color: "#7C5CFF" }),
            f("arcade", 7, 0, 4, { color: "#FF6B6B" }),
            f("arcade", 8, 0, 4, { color: "#2F6BFF" }),
            f("arcade", 9, 0, 4, { color: "#FFB627" }),
            f("lamp", 11, 0, 2, { color: "#22D3EE" }),
            ...chessSet(3, 7, "schaakbord-2"),
            ...chessSet(7, 7, "schaakbord-3"),
            f("rug", 2, 6, 2, { w: 7, d: 3, color: "#2F6BFF" }),
            f("sofa", 1, 1, 2),
            f("sofa", 1, 2, 2),
            f("sofa", 1, 3, 2),
            f("plant", 1, 0),
            f("plant", 11, 9),
        ],
    },
    {
        id: "rustige-lounge",
        name: "Rustige lounge",
        description: "Banken, planten en zacht licht.",
        map: [
            "x00000000xxx",
            "x00000000xxx",
            "x00000000xxx",
            "000000000000",
            "x00000000000",
            "x00000000000",
            "x00000000000",
            "x00000000000",
        ],
        door: { x: 0, y: 3, dir: 2 },
        colors: {
            floorA: "#FFF8EA",
            floorB: "#FDEECF",
            wallLeft: "#FFE1A8",
            wallRight: "#F2C877",
        },
        furni: [
            f("rug", 3, 3, 2, { w: 3, d: 3, color: "#FF6B6B" }),
            f("sofa", 2, 3, 2, { color: "#FFB627" }),
            f("sofa", 2, 4, 2, { color: "#FFB627" }),
            f("sofa", 2, 5, 2, { color: "#FFB627" }),
            f("sofa", 6, 3, 6, { color: "#FFB627" }),
            f("sofa", 6, 4, 6, { color: "#FFB627" }),
            f("sofa", 6, 5, 6, { color: "#FFB627" }),
            f("sofa", 3, 6, 0, { color: "#FF6B6B" }),
            f("sofa", 4, 6, 0, { color: "#FF6B6B" }),
            f("sofa", 5, 6, 0, { color: "#FF6B6B" }),
            f("table", 4, 4, 2, { color: "#FFFFFF" }),
            ...chessSet(10, 5, "schaakbord-4"),
            f("lamp", 1, 0),
            f("lamp", 7, 7),
            f("plant", 8, 0),
            f("plant", 1, 7),
            f("plant", 11, 3),
        ],
    },
    {
        id: "eerstejaars-hal",
        name: "Eerstejaars-hal",
        description: "Grote hal: veel nieuwe mensen om te ontmoeten.",
        map: [
            "x00000000000000",
            "x00000000000000",
            "x00000000000000",
            "x00000000000000",
            "x00000000000000",
            "000000000000000",
            "x00000000000000",
            "x00000000000000",
            "x00000000000000",
            "x00000000000000",
            "x00000000000000",
        ],
        door: { x: 0, y: 5, dir: 2 },
        colors: {
            floorA: "#FFF1F1",
            floorB: "#FFE0E0",
            wallLeft: "#FFC9C9",
            wallRight: "#F5A8A8",
        },
        furni: [
            ...tableSet(4, 3, "#FF6B6B"),
            ...tableSet(4, 8, "#FF6B6B"),
            ...tableSet(10, 8, "#2F6BFF"),
            ...chessSet(11, 3, "schaakbord-5"),
            f("rug", 6, 4, 2, { w: 3, d: 3, color: "#FFB627" }),
            f("arcade", 13, 0, 4, { color: "#7C5CFF" }),
            f("arcade", 12, 0, 4, { color: "#14B8A6" }),
            f("sofa", 1, 0, 2, { color: "#2F6BFF" }),
            f("sofa", 1, 1, 2, { color: "#2F6BFF" }),
            f("plant", 1, 10),
            f("plant", 14, 10),
            f("plant", 14, 0),
            f("lamp", 7, 0),
        ],
    },
    {
        id: "arcade",
        name: "Arcade",
        description: ".",
        map: [
            "x0000000000000",
            "x0000000000000",
            "x0000000000000",
            "x0000000000000",
            "x0000000000000",
            "00000000000000",
            "x0000000000000",
            "x0000000000000",
            "x0000000000000",
            "x0000000000000",
            "x0000000000000",
        ],
        door: { x: 0, y: 5, dir: 2 },
        colors: {
            floorA: "#1E1B4B",
            floorB: "#26215F",
            wallLeft: "#4C3A9E",
            wallRight: "#3A2D80",
        },
        furni: [
            // Neonborden aan de muren
            f("neon", 3, 0, 4, { w: 4, text: "ARCADE", color: "#FF4FD8" }),
            // Rij kasten tegen de achterwand
            ...arcadeSet(3, 0, 4, "arcade-1", "#7C5CFF"),
            ...arcadeSet(4, 0, 4, "arcade-2", "#FF6B6B"),
            // Stack (ArcadeController): zelfde plek en kruk als de arcadekast die hier stond
            f("stack", 5, 0, 4, { id: "stack-1", color: "#2F6BFF" }),
            f("stool", 5, 1, 0, { color: "#2F6BFF" }),
            // Wave Rush (ArcadeController): kast met een jetski ervoor, op de plek van een arcadekast met kruk
            f("waverush", 6, 0, 4, { id: "waverush-1", color: "#0E7490" }),
            f("jetski", 6, 1, 0, { id: "waverush-jetski" }),
            ...arcadeSet(7, 0, 4, "arcade-5", "#14B8A6"),
            f("claw", 9, 0, 4, { color: "#FF6B6B" }),
            f("claw", 10, 0, 4, { color: "#22D3EE" }),
            f("hammer", 12, 0, 4, { id: "kop-van-jut" }),
            // Scorebord met de top 3 per arcadespel, wisselend (gevuld door de lobby-pagina)
            f("scoreboard", 1, 7, 2, {
                id: "arcade-scores",
                w: 3,
                text: "ARCADE · TOP 3 VANDAAG",
            }),
            // Kasten tegen de linkerwand
            ...arcadeSet(1, 7, 2, "arcade-6", "#FF6B6B"),
            ...arcadeSet(1, 8, 2, "arcade-7", "#7C5CFF"),
            ...arcadeSet(1, 9, 2, "arcade-8", "#FFB627"),
            // Racekasten met racestoel
            ...racerSet(9, 6, "race-1", "#FF6B6B"),
            ...racerSet(10, 6, "race-2", "#2F6BFF"),
            ...racerSet(11, 6, "race-3", "#FFB627"),
            f("dancefloor", 4, 3, 2, { w: 4, d: 4 }),
            f("airhockey", 6, 9, 2, { id: "airhockey-1", color: "#7C5CFF" }),
            // Prijzenbalie
            f("counter", 13, 2, 2, { color: "#7C5CFF" }),
            f("counter", 13, 3, 2, { color: "#7C5CFF" }),
            f("counter", 13, 4, 2, { color: "#7C5CFF" }),
            f("sofa", 1, 1, 2, { color: "#FF6B6B" }),
            f("sofa", 1, 2, 2, { color: "#FF6B6B" }),
            f("sofa", 1, 3, 2, { color: "#FF6B6B" }),
            f("lamp", 1, 0, 2, { color: "#22D3EE" }),
            f("lamp", 13, 0, 2, { color: "#FF4FD8" }),
            f("lamp", 13, 10, 2, { color: "#FF6B6B" }),
            f("plant", 1, 10),
        ],
    },
];

/**
 * Ruimtes die nu op de site staan. De andere staan tijdelijk offline: zet hun
 * id hier terug (en in LobbyController/DashboardController) om ze weer te tonen.
 */
export const ONLINE_ROOM_IDS = ["kantine", "arcade"];
export const ONLINE_ROOMS = ROOMS.filter((r) => ONLINE_ROOM_IDS.includes(r.id));

export const getRoomDef = (id: string) =>
    ONLINE_ROOMS.find((r) => r.id === id) ?? ONLINE_ROOMS[0];

export const PALETTE = {
    skin: ["#FFDBB8", "#F1C7A5", "#E0AC7E", "#C68642", "#8D5524"],
    hair: [
        "#2B1B10",
        "#5A3A1E",
        "#C9A15B",
        "#E8D27A",
        "#A23B2A",
        "#1F1F2E",
        "#7C5CFF",
        "#22D3EE",
    ],
    shirt: [
        "#2F6BFF",
        "#14B8A6",
        "#FFB627",
        "#FF6B6B",
        "#22D3EE",
        "#7C5CFF",
        "#0F1E3A",
        "#FFFFFF",
    ],
    pants: ["#0F1E3A", "#3B4A68", "#5B6B8A", "#1E3A8A", "#7A5230", "#0F766E"],
    shoes: ["#FFFFFF", "#1F1F2E", "#C81E1E", "#FFB627"],
};

const pick = <T>(arr: readonly T[]) =>
    arr[Math.floor(Math.random() * arr.length)];

export function randomLook(): AvatarLook {
    return {
        skin: pick(PALETTE.skin),
        hair: pick(PALETTE.hair),
        hairStyle: pick([0, 1, 2] as HairStyle[]),
        shirt: pick(PALETTE.shirt),
        pants: pick(PALETTE.pants),
        shoes: pick(PALETTE.shoes),
    };
}
