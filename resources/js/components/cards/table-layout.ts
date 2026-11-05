/** Where a seat is around the table, seen from your own seat (always at the bottom). */
export type SeatSide = "bottom" | "left" | "top" | "right";

/** Clockwise from the bottom, like the direction of play 1 (seat 0 → 1 → 2). */
const SIDES: Record<number, SeatSide[]> = {
    2: ["bottom", "top"],
    3: ["bottom", "left", "right"],
    4: ["bottom", "left", "top", "right"],
};

export function seatSide(
    seat: number,
    mySeat: number,
    count: number,
): SeatSide {
    return SIDES[count][(seat - mySeat + count) % count];
}

/** Where each seat sits on the table area. */
export const SEAT_CLASSES: Record<SeatSide, string> = {
    top: "top-2 left-1/2 -translate-x-1/2",
    left: "top-1/2 left-1 -translate-y-1/2 sm:left-3",
    right: "top-1/2 right-1 -translate-y-1/2 sm:right-3",
    bottom: "bottom-1 left-1/2 -translate-x-1/2",
};

/** Points on the table (in % of the table area) where cards fly from and to. */
export const ANCHORS: Record<
    SeatSide | "pile" | "discard",
    { x: string; y: string }
> = {
    bottom: { x: "50%", y: "92%" },
    left: { x: "11%", y: "45%" },
    top: { x: "50%", y: "12%" },
    right: { x: "89%", y: "45%" },
    pile: { x: "41%", y: "47%" },
    discard: { x: "59%", y: "47%" },
};
