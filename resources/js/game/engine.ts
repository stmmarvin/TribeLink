import { AVATAR_HEAD, drawAvatar } from "./draw/avatar";
import {
    drawFlatFurni,
    FURNI_INFO,
    furniDrawables,
    isFlatFurni,
    type Drawable,
} from "./draw/furni";
import {
    DIRS,
    dirFromDelta,
    iso,
    LEVEL_H,
    pointInTile,
    shade,
    tileCenter,
} from "./iso";
import { findPath } from "./pathfinding";
import type {
    Avatar,
    AvatarLook,
    ChatEntry,
    Dir,
    EngineEvents,
    Furni,
    PlayerState,
    RemotePlayer,
    RoomDef,
    Selection,
    Tile,
} from "./types";

/** Een andere speler (via de server), te herkennen aan id `u<userId>`. */
const isRemote = (av: Avatar) => !av.isMe && av.id.startsWith("u");

/** Tijd per stap (ms). Diagonaal duurt iets langer. */
const STEP_MS = 420;
const WALL_TOP = 116;
const FLOOR_THICK = 8;
const WALL_THICK = 0.14;
const BUBBLE_H = 24;
const BUBBLE_DRIFT_MS = 4500;
/** Een chatballon verdwijnt 30 s na het versturen (laatste seconde vervaagt hij). */
const BUBBLE_LIFETIME_MS = 30_000;
const BUBBLE_FADE_MS = 1000;
/** Onder deze breedte (px) start de camera ingezoomd op je avatar. */
const MOBILE_W = 640;
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2];

type Bubble = {
    id: number;
    x: number;
    y: number;
    name: string;
    text: string;
    isMe: boolean;
    born: number;
    offset: number;
    target: number;
};

type Hitbox = {
    x: number;
    y: number;
    w: number;
    h: number;
    type: "avatar" | "furni";
    id: string;
};

export type PlayerInfo = { name: string; motto: string; look: AvatarLook };

/**
 * HotelEngine — tekent en simuleert één isometrische kamer op een <canvas>.
 *
 * Losgekoppeld van React: de pagina maakt één engine aan, roept methodes aan
 * (sendChat, wave, loadRoom, …) en krijgt events terug (onSelect, onChat, …).
 *
 * Elke frame:  update(dt)  → avatars verplaatsen, ballonnen laten stijgen
 *              render()    → muren → vloer → tapijten → [meubels + avatars gesorteerd op diepte] → ballonnen
 */
export class HotelEngine {
    private ctx: CanvasRenderingContext2D;
    private ro: ResizeObserver;
    private raf = 0;
    private last = performance.now();

    private room!: RoomDef;
    private heights: Array<Array<number | undefined>> = [];
    private furni: Furni[] = [];
    private avatars: Avatar[] = [];
    private me!: Avatar;
    private bubbles: Bubble[] = [];
    private nextDrift = 0;
    private bubbleSeq = 0;
    /** Hoe vaak je zelf gezwaaid hebt (de server geeft dit door aan de anderen). */
    private myWaves = 0;

    private view = { w: 0, h: 0, dpr: 1 };
    private cam = { x: 0, y: 0 };
    private zoom = 1;
    private needsCenter = true;
    /** Camera-animatie (in- of uitzoomen op een arcadekast). */
    private camAnim?: {
        from: { x: number; y: number; zoom: number };
        to: { x: number; y: number; zoom: number };
        start: number;
        ms: number;
        done?: () => void;
    };
    /** Na het (her)laden van de kamer: vanaf dit meubel uitzoomen. */
    private zoomOutFromId?: string;
    /** Camera volgt je eigen avatar (mobiel), tot je zelf het beeld versleept. */
    private follow = false;

    private hitboxes: Hitbox[] = [];
    private hoverTile?: Tile;
    private hoverAvatarId?: string;
    private selectedId?: string;
    private drag?: {
        sx: number;
        sy: number;
        camX: number;
        camY: number;
        moved: boolean;
    };
    private lastWheel = 0;

    constructor(
        private canvas: HTMLCanvasElement,
        private events: EngineEvents = {},
        /** Preview (welkomstpagina): kamer altijd passend in beeld, geen onderbalk, geen volg-camera. */
        private opts: { preview?: boolean } = {},
    ) {
        this.ctx = canvas.getContext("2d")!;
        canvas.addEventListener("pointerdown", this.onPointerDown);
        canvas.addEventListener("pointermove", this.onPointerMove);
        canvas.addEventListener("pointerup", this.onPointerUp);
        canvas.addEventListener("pointerleave", this.onPointerLeave);
        canvas.addEventListener("wheel", this.onWheel, { passive: false });
        this.ro = new ResizeObserver(() => this.resize());
        this.ro.observe(canvas.parentElement ?? canvas);
        this.resize();
        this.raf = requestAnimationFrame(this.frame);
    }

    destroy() {
        cancelAnimationFrame(this.raf);
        this.ro.disconnect();
        this.canvas.removeEventListener("pointerdown", this.onPointerDown);
        this.canvas.removeEventListener("pointermove", this.onPointerMove);
        this.canvas.removeEventListener("pointerup", this.onPointerUp);
        this.canvas.removeEventListener("pointerleave", this.onPointerLeave);
        this.canvas.removeEventListener("wheel", this.onWheel);
    }

    // ─── Kamer laden ────────────────────────────────────────────────────────────

    loadRoom(def: RoomDef, player: PlayerInfo) {
        this.room = def;
        this.heights = def.map.map((row) =>
            [...row].map((ch) => (ch === "x" ? undefined : Number(ch))),
        );
        this.furni = def.furni.map((f) => ({ ...f }));
        this.avatars = [];
        this.bubbles = [];
        this.select(null);
        this.needsCenter = true;

        this.me = this.createAvatar(
            "me",
            player.name,
            player.motto,
            player.look,
            def.door,
            true,
        );
        this.me.dir = def.door.dir;
        this.avatars.push(this.me);

        // Binnenlopen door de deur
        const d = DIRS[def.door.dir];
        this.walkTo(this.me, { x: def.door.x + d.dx, y: def.door.y + d.dy });
        this.system(`Je bent in ${def.name}. Klik op de vloer om te lopen.`);
        this.events.onPeopleChange?.(this.avatars.length);
    }

    private createAvatar(
        id: string,
        name: string,
        motto: string,
        look: AvatarLook,
        at: Tile,
        isMe: boolean,
    ): Avatar {
        return {
            id,
            name,
            motto,
            look,
            isMe,
            x: at.x,
            y: at.y,
            progress: 0,
            path: [],
            dir: 2,
            sitting: false,
            dancing: false,
            waveUntil: 0,
            typingUntil: 0,
        };
    }

    // ─── Publieke acties (vanuit de React-UI) ───────────────────────────────────

    sendChat(raw: string) {
        const text = raw.trim().slice(0, 100);
        if (!text) return;
        // Habbo-achtige commando's
        const cmd = text.toLowerCase();
        if ([":wave", "/zwaai", "o/"].includes(cmd)) return this.wave(this.me);
        if ([":dance", "/dans"].includes(cmd)) return this.toggleDance(this.me);
        if ([":sit", "/zit"].includes(cmd)) return this.sitOnFloor();
        this.say(this.me, text);
    }

    setTyping(typing: boolean) {
        if (this.me)
            this.me.typingUntil = typing ? performance.now() + 2500 : 0;
    }

    waveMe = () => this.wave(this.me);
    danceMe = () => this.toggleDance(this.me);

    sitOnFloor() {
        const me = this.me;
        if (me.next || me.path.length) return;
        me.sitting = !me.sitting;
        me.dancing = false;
        // Op de grond zitten kan alleen in de vier "rechte" richtingen
        if (me.sitting && me.dir % 2) me.dir = ((me.dir + 1) % 8) as Dir;
    }

    setLook(look: AvatarLook) {
        if (!this.me) return;
        this.me.look = look;
        if (this.selectedId === "me") this.select(this.me);
    }

    /** Naar een meubel lopen en gaan zitten (of naast een tafel/spel gaan staan). */
    useFurni(id: string) {
        const f = this.furni.find((x) => x.id === id);
        if (!f) return;
        if (FURNI_INFO[f.kind].seat) this.walkTo(this.me, f);
        else {
            const seat = this.seatsAround(f).find(
                (s) => !this.occupant(s.x, s.y),
            );
            if (seat) this.walkTo(this.me, seat);
            // Spel zonder stoel (Kop van Jut, airhockey): voor het apparaat gaan staan
            else if (FURNI_INFO[f.kind].game)
                this.walkTo(this.me, {
                    x: f.x + DIRS[f.dir].dx,
                    y: f.y + DIRS[f.dir].dy,
                });
        }
    }

    zoomBy(step: 1 | -1, anchor?: { x: number; y: number }) {
        const i = ZOOMS.indexOf(this.zoom);
        const next =
            ZOOMS[
                Math.max(0, Math.min(ZOOMS.length - 1, (i < 0 ? 2 : i) + step))
            ];
        const ax = anchor?.x ?? this.view.w / 2;
        const ay = anchor?.y ?? this.view.h / 2;
        // Zoom rond het ankerpunt: het wereldpunt onder de cursor blijft staan
        this.cam.x = ax - ((ax - this.cam.x) / this.zoom) * next;
        this.cam.y = ay - ((ay - this.cam.y) / this.zoom) * next;
        this.zoom = next;
    }

    recenter() {
        this.needsCenter = true;
    }

    /** Tekst van een meubel aanpassen (scorebord aan de muur). */
    setFurniText(id: string, text: string) {
        const f = this.furni.find((x) => x.id === id);
        if (f) f.text = text;
    }

    /**
     * Camera soepel inzoomen op een meubel, bijvoorbeeld het scherm van een arcadekast
     * vlak voordat het spel opent. Resolvet als de camera er is.
     */
    focusFurni(id: string, ms = 700): Promise<void> {
        const to = this.focusView(id);
        if (!to || ms <= 0) return Promise.resolve();
        this.follow = false;
        return new Promise((done) => {
            this.camAnim = {
                from: { ...this.cam, zoom: this.zoom },
                to,
                start: performance.now(),
                ms,
                done,
            };
        });
    }

    /** Bij terugkomen uit een spel: de kamer begint ingezoomd op dit meubel en zoomt uit. */
    zoomOutFrom(id: string) {
        this.zoomOutFromId = id;
    }

    /** Camerastand waarin het meubel (ongeveer op 2/3 van zijn hoogte) groot in beeld is. */
    private focusView(id: string) {
        const f = this.furni.find((x) => x.id === id);
        if (!f) return undefined;
        const z =
            (this.tileZ(f.x, f.y) ?? 0) * LEVEL_H +
            FURNI_INFO[f.kind].height * 0.6;
        const p = tileCenter(f.x, f.y, z);
        const zoom = 5;
        return {
            x: this.view.w / 2 - p.x * zoom,
            y: this.view.h / 2 - p.y * zoom,
            zoom,
        };
    }

    private stepCamAnim(now: number) {
        const a = this.camAnim!;
        const t = Math.min(1, (now - a.start) / a.ms);
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        this.zoom = a.from.zoom + (a.to.zoom - a.from.zoom) * e;
        this.cam.x = a.from.x + (a.to.x - a.from.x) * e;
        this.cam.y = a.from.y + (a.to.y - a.from.y) * e;
        if (t >= 1) {
            this.camAnim = undefined;
            a.done?.();
        }
    }

    /** Vrije vloertegels: geen meubel (ook geen stoel), niemand erop, niet de deur. */
    private freeTiles(): Tile[] {
        const { door } = this.room;
        const tiles: Tile[] = [];
        this.heights.forEach((row, y) =>
            row.forEach((z, x) => {
                if (
                    z === undefined ||
                    (x === door.x && y === door.y) ||
                    this.occupant(x, y)
                )
                    return;
                if (
                    !this.furni.some(
                        (f) => f.x === x && f.y === y && !isFlatFurni(f),
                    )
                )
                    tiles.push({ x, y });
            }),
        );
        return tiles;
    }

    /**
     * Extra (niet-bestuurbaar) poppetje op een willekeurige vrije tegel — alleen voor de preview.
     * Geeft het id terug, of undefined als er geen plek is.
     */
    addFigurant(name: string, look: AvatarLook): string | undefined {
        const tiles = this.freeTiles();
        if (!tiles.length) return;
        const at = tiles[Math.floor(Math.random() * tiles.length)];
        const av = this.createAvatar(
            `npc${this.avatars.length}`,
            name,
            "",
            look,
            at,
            false,
        );
        av.dir = (Math.floor(Math.random() * 4) * 2) as Dir;
        this.avatars.push(av);
        this.events.onPeopleChange?.(this.avatars.length);
        return av.id;
    }

    /** Naar een willekeurige plek lopen (voor de preview, waar niemand klikt). Soms naar een stoel. */
    wander(id = "me") {
        const av = this.avatars.find((a) => a.id === id);
        if (!av || av.next || av.path.length) return;
        const seats = this.furni.filter(
            (f) => FURNI_INFO[f.kind].seat && !this.occupant(f.x, f.y),
        );
        const tiles: Tile[] =
            Math.random() < 0.25 && seats.length ? seats : this.freeTiles();
        for (let i = 0; i < 5 && tiles.length; i++) {
            if (
                this.walkTo(av, tiles[Math.floor(Math.random() * tiles.length)])
            )
                return;
        }
    }

    // ─── Multiplayer (andere spelers in dezelfde kamer) ────────────────────────

    /** Jouw avatar voor de server: de tegel waar je naartoe loopt, en wat je doet. */
    myState(): PlayerState | null {
        const me = this.me;
        if (!me) return null;
        const goal = me.path[me.path.length - 1] ??
            me.next ?? { x: me.x, y: me.y };
        return {
            x: goal.x,
            y: goal.y,
            dir: me.dir,
            sitting: me.sitting,
            dancing: me.dancing,
            typing: me.typingUntil > performance.now(),
            waves: this.myWaves,
        };
    }

    /**
     * Zet de andere spelers neer zoals de server ze doorgeeft: nieuwe komen
     * binnen, wie verplaatst is loopt erheen, wie weg is verdwijnt.
     */
    syncRemotes(players: RemotePlayer[]) {
        if (!this.room) return;
        const seen = new Set<string>();

        for (const p of players) {
            const id = `u${p.id}`;
            seen.add(id);
            const target = { x: p.x, y: p.y };
            let av = this.avatars.find((a) => a.id === id);

            if (!av) {
                // Verschijnt waar hij staat (of bij de deur als die tegel niet bestaat)
                const onFloor = this.tileZ(p.x, p.y) !== undefined;
                av = this.createAvatar(
                    id,
                    p.username,
                    "",
                    p.look,
                    onFloor ? target : this.room.door,
                    false,
                );
                av.dir = p.dir;
                av.waveSeq = p.waves;
                this.avatars.push(av);
            } else {
                av.name = p.username;
                av.look = p.look;
                const goal = av.path[av.path.length - 1] ??
                    av.next ?? { x: av.x, y: av.y };
                // Geen route (bijv. kamer net gewisseld)? Dan er meteen neerzetten.
                if (
                    (goal.x !== p.x || goal.y !== p.y) &&
                    !this.walkTo(av, target)
                ) {
                    av.path = [];
                    av.next = undefined;
                    av.x = p.x;
                    av.y = p.y;
                }
                if (p.waves > (av.waveSeq ?? 0)) this.wave(av);
                av.waveSeq = p.waves;
            }

            // Zitten en kijkrichting alleen overnemen als hij stilstaat
            if (!av.next && !av.path.length) {
                av.dir = p.dir;
                av.sitting = p.sitting;
            }
            av.dancing = p.dancing;
            av.typingUntil = p.typing ? performance.now() + 2500 : 0;
        }

        const before = this.avatars.length;
        this.avatars = this.avatars.filter(
            (a) => !isRemote(a) || seen.has(a.id),
        );
        if (
            this.selectedId &&
            !this.avatars.some((a) => a.id === this.selectedId)
        )
            this.select(null);
        if (this.avatars.length !== before || players.length)
            this.events.onPeopleChange?.(this.avatars.length);
    }

    /** Een chatregel van een andere speler (via de server). */
    remoteSay(userId: number, text: string) {
        const av = this.avatars.find((a) => a.id === `u${userId}`);
        if (av) this.say(av, text);
    }

    /** Preview: een poppetje laten zwaaien of (even) dansen. */
    waveAs(id: string) {
        const av = this.avatars.find((a) => a.id === id);
        if (av) this.wave(av);
    }

    danceAs(id: string) {
        const av = this.avatars.find((a) => a.id === id);
        if (av) this.toggleDance(av);
    }

    // ─── Simulatie ──────────────────────────────────────────────────────────────

    private tileZ(x: number, y: number) {
        return this.heights[y]?.[x];
    }

    private solidFurniAt(x: number, y: number) {
        return this.furni.find(
            (f) => f.x === x && f.y === y && !FURNI_INFO[f.kind].walkable,
        );
    }

    private seatAt(x: number, y: number) {
        return this.furni.find(
            (f) => f.x === x && f.y === y && FURNI_INFO[f.kind].seat,
        );
    }

    private occupant(x: number, y: number, except?: Avatar) {
        return this.avatars.find(
            (a) =>
                a !== except &&
                ((a.x === x && a.y === y) ||
                    (a.next?.x === x && a.next?.y === y)),
        );
    }

    /**
     * Mag `av` van `from` naar `to` stappen? Vloer, max. 1 hoogteverschil, geen meubel, geen andere avatar.
     * Andere spelers (multiplayer) blokkeren niet en worden niet geblokkeerd: door netwerkvertraging
     * zouden ze elkaar anders klem zetten, bijvoorbeeld bij de deur.
     */
    private canStep = (av: Avatar) => (from: Tile, to: Tile) => {
        const zf = this.tileZ(from.x, from.y);
        const zt = this.tileZ(to.x, to.y);
        if (zf === undefined || zt === undefined || Math.abs(zt - zf) > 1)
            return false;
        if (this.solidFurniAt(to.x, to.y)) return false;
        if (isRemote(av)) return true;
        const other = this.occupant(to.x, to.y, av);
        return !other || isRemote(other);
    };

    private walkTo(av: Avatar, goal: Tile) {
        const start = av.next ?? { x: av.x, y: av.y };
        const path = findPath(start, goal, this.canStep(av));
        if (!path.length) return false;
        av.path = path;
        av.sitting = false;
        return true;
    }

    private startNextStep(av: Avatar) {
        const n = av.path[0];
        if (!n) return;
        if (!this.canStep(av)({ x: av.x, y: av.y }, n)) {
            // Iemand staat in de weg → opnieuw route berekenen naar hetzelfde doel
            const goal = av.path[av.path.length - 1];
            const detour = findPath(
                { x: av.x, y: av.y },
                goal,
                this.canStep(av),
            );
            if (!detour.length) {
                // Geen omweg: even wachten (de ander loopt vaak door), na 3 s opgeven
                const now = performance.now();
                av.blockedSince ??= now;
                if (now - av.blockedSince > 3000) {
                    av.path = [];
                    av.blockedSince = undefined;
                }
                return;
            }
            av.path = detour;
        }
        av.blockedSince = undefined;
        av.next = av.path.shift();
        av.dir = dirFromDelta(av.next!.x - av.x, av.next!.y - av.y);
    }

    /** Aangekomen: op een stoel/bank ga je automatisch zitten. */
    private arrive(av: Avatar) {
        const seat = this.seatAt(av.x, av.y);
        if (seat) {
            av.sitting = true;
            av.dancing = false;
            av.dir = seat.dir;
        }
    }

    private update(dt: number, now: number) {
        for (const av of this.avatars) {
            if (!av.next && av.path.length) this.startNextStep(av);
            if (av.next) {
                const diag = av.next.x !== av.x && av.next.y !== av.y;
                av.progress += dt / (diag ? STEP_MS * 1.25 : STEP_MS);
                if (av.progress >= 1) {
                    av.x = av.next.x;
                    av.y = av.next.y;
                    av.next = undefined;
                    av.progress = av.path.length ? av.progress - 1 : 0;
                    if (av.path.length) this.startNextStep(av);
                    else this.arrive(av);
                }
            }
        }

        // Chatballonnen stijgen af en toe één rij, zoals in Habbo
        if (now >= this.nextDrift) {
            for (const b of this.bubbles) b.target += BUBBLE_H;
            this.nextDrift = now + BUBBLE_DRIFT_MS;
        }
        for (const b of this.bubbles)
            b.offset += (b.target - b.offset) * Math.min(1, dt * 0.012);
        this.bubbles = this.bubbles.filter(
            (b) => b.offset < 420 && now - b.born < BUBBLE_LIFETIME_MS,
        );
    }

    // ─── Chat ───────────────────────────────────────────────────────────────────

    private say(av: Avatar, text: string) {
        const now = performance.now();
        av.typingUntil = 0;
        const pos = this.avatarPos(av);
        // Bestaande ballonnen één rij omhoog duwen zodat ze niet overlappen
        for (const b of this.bubbles) b.target += BUBBLE_H;
        this.bubbles.push({
            id: ++this.bubbleSeq,
            x: pos.x,
            y: pos.y - AVATAR_HEAD - 30,
            name: av.name,
            text,
            isMe: av.isMe,
            born: now,
            offset: 0,
            target: 0,
        });
        this.nextDrift = now + BUBBLE_DRIFT_MS;
        this.emitChat({ name: av.name, text, isMe: av.isMe });
        if (av.isMe) this.events.onSay?.(text);
    }

    private system(text: string) {
        this.emitChat({ name: "Hotel", text, system: true });
    }

    private emitChat(e: Omit<ChatEntry, "id" | "at">) {
        this.events.onChat?.({
            ...e,
            id: `c${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            at: Date.now(),
        });
    }

    private wave(av: Avatar) {
        av.waveUntil = performance.now() + 2000;
        if (av === this.me) this.myWaves++;
    }

    private toggleDance(av: Avatar) {
        av.dancing = !av.dancing;
        if (av.dancing) av.sitting = false;
    }

    // ─── Hulpjes ───────────────────────────────────────────────────────────────

    /** Zitplekken rondom een meubel; recht ervoor/ernaast eerst, schuin daarna. */
    private seatsAround(f: Furni): Tile[] {
        const dist = (s: Furni) => Math.abs(s.x - f.x) + Math.abs(s.y - f.y);
        return this.furni
            .filter(
                (s) =>
                    FURNI_INFO[s.kind].seat &&
                    Math.max(Math.abs(s.x - f.x), Math.abs(s.y - f.y)) === 1,
            )
            .sort((a, b) => dist(a) - dist(b));
    }

    // ─── Posities ───────────────────────────────────────────────────────────────

    /** Schermpositie (wereld-px) van de voeten, inclusief tussen-tegel-interpolatie en zithoogte. */
    private avatarPos(av: Avatar) {
        const t = av.next ? av.progress : 0;
        const nx = av.next?.x ?? av.x;
        const ny = av.next?.y ?? av.y;
        const fx = av.x + (nx - av.x) * t;
        const fy = av.y + (ny - av.y) * t;
        const z0 = this.tileZ(av.x, av.y) ?? 0;
        const z1 = this.tileZ(nx, ny) ?? z0;
        let z = (z0 + (z1 - z0) * t) * LEVEL_H;
        if (av.sitting)
            z += FURNI_INFO[this.seatAt(av.x, av.y)?.kind ?? "rug"].seat ?? 0;
        return tileCenter(fx, fy, z);
    }

    // ─── Rendering ──────────────────────────────────────────────────────────────

    private frame = (now: number) => {
        const dt = Math.min(100, now - this.last);
        this.last = now;
        if (this.room) {
            this.update(dt, now);
            this.render(now);
        }
        this.raf = requestAnimationFrame(this.frame);
    };

    private resize() {
        const el = this.canvas.parentElement ?? this.canvas;
        const { width, height } = el.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.view = { w: width, h: height, dpr };
        this.canvas.width = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        // Preview kan niet verslepen/zoomen → bij elke nieuwe maat opnieuw passend maken
        if (this.opts.preview) this.needsCenter = true;
    }

    /** Kamer passend centreren (en zoom kiezen) zodra de afmetingen bekend zijn. */
    private center() {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        this.heights.forEach((row, y) =>
            row.forEach((z, x) => {
                if (z === undefined) return;
                for (const p of [
                    iso(x, y, WALL_TOP),
                    iso(x + 1, y + 1, -FLOOR_THICK),
                    iso(x + 1, y),
                    iso(x, y + 1),
                ]) {
                    minX = Math.min(minX, p.x);
                    maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y);
                    maxY = Math.max(maxY, p.y);
                }
            }),
        );
        this.needsCenter = false;
        if (this.opts.preview) {
            // Hele kamer passend, zonder ruimte voor knoppen en zonder vaste zoomstappen
            this.follow = false;
            this.zoom = Math.min(
                (this.view.w - 32) / (maxX - minX),
                (this.view.h - 32) / (maxY - minY),
            );
            this.cam.x = this.view.w / 2 - ((minX + maxX) / 2) * this.zoom;
            this.cam.y = this.view.h / 2 - ((minY + maxY) / 2) * this.zoom;
            return;
        }
        // Smal scherm (telefoon): de hele kamer passend maken wordt piepklein (±50%).
        // Daarom op 100% beginnen en de camera op je eigen avatar richten.
        if (this.view.w < MOBILE_W) {
            this.zoom = 1;
            this.follow = true;
            this.followMe(1);
            return;
        }
        this.follow = false;
        const fit = Math.min(
            (this.view.w - 32) / (maxX - minX),
            (this.view.h - 140) / (maxY - minY),
        );
        this.zoom =
            [...ZOOMS].reverse().find((z) => z <= Math.min(fit, 1.5)) ??
            ZOOMS[0];
        this.cam.x = this.view.w / 2 - ((minX + maxX) / 2) * this.zoom;
        this.cam.y = (this.view.h - 70) / 2 - ((minY + maxY) / 2) * this.zoom;
    }

    /** Camera richting je avatar schuiven; `ease` 1 = direct, kleiner = soepel meebewegen. */
    private followMe(ease: number) {
        const p = this.avatarPos(this.me);
        // Midden van het zichtbare stuk boven de onderbalk (±130 px op mobiel)
        const tx = this.view.w / 2 - p.x * this.zoom;
        const ty =
            (this.view.h - 130) / 2 - (p.y - AVATAR_HEAD / 2) * this.zoom;
        this.cam.x += (tx - this.cam.x) * ease;
        this.cam.y += (ty - this.cam.y) * ease;
    }

    private render(now: number) {
        const { ctx } = this;
        const { w, h, dpr } = this.view;
        if (!w || !h) return;
        if (this.needsCenter) {
            this.center();
            const from =
                this.zoomOutFromId && this.focusView(this.zoomOutFromId);
            this.zoomOutFromId = undefined;
            if (from) {
                this.camAnim = {
                    from,
                    to: { ...this.cam, zoom: this.zoom },
                    start: now,
                    ms: 900,
                };
            }
        }
        if (this.camAnim) this.stepCamAnim(now);
        else if (this.follow && !this.drag?.moved) this.followMe(0.08);

        // Achtergrond (schermruimte)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, "#0F1E3A");
        bg.addColorStop(1, "#1B3A6B");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Wereldruimte: camera + zoom
        ctx.setTransform(
            dpr * this.zoom,
            0,
            0,
            dpr * this.zoom,
            dpr * this.cam.x,
            dpr * this.cam.y,
        );
        ctx.imageSmoothingEnabled = false;

        // De deurtegel ligt achter de muurlijn → eerst tekenen, zodat de muur ervoor hem afdekt
        this.drawFloor(true);
        this.drawWalls();
        this.drawFloor(false);
        for (const f of this.furni)
            if (isFlatFurni(f))
                drawFlatFurni(
                    ctx,
                    f,
                    (this.tileZ(f.x, f.y) ?? 0) * LEVEL_H,
                    now,
                );
        this.drawTileCursor();

        // Meubels en avatars samen sorteren op diepte (x + y): wat verder weg staat eerst
        const items: Array<Drawable & { hit?: Hitbox }> = [];
        for (const f of this.furni) {
            if (isFlatFurni(f)) continue;
            const z = (this.tileZ(f.x, f.y) ?? 0) * LEVEL_H;
            const c = tileCenter(f.x, f.y, z);
            const hh = FURNI_INFO[f.kind].height;
            furniDrawables(f, z, now).forEach((d, i) =>
                items.push({
                    ...d,
                    hit:
                        i === 0
                            ? {
                                  x: c.x - 22,
                                  y: c.y - hh,
                                  w: 44,
                                  h: hh + 10,
                                  type: "furni",
                                  id: f.id,
                              }
                            : undefined,
                }),
            );
        }
        for (const av of this.avatars) {
            const key =
                Math.max(av.x + av.y, av.next ? av.next.x + av.next.y : -1) +
                0.5;
            const p = this.avatarPos(av);
            items.push({
                key,
                draw: (c) => this.drawAvatarAt(c, av, p, now),
                hit: {
                    x: p.x - 14,
                    y: p.y - AVATAR_HEAD - 6,
                    w: 28,
                    h: AVATAR_HEAD + 10,
                    type: "avatar",
                    id: av.id,
                },
            });
        }
        items.sort((a, b) => a.key - b.key);
        this.hitboxes = [];
        for (const it of items) {
            it.draw(ctx);
            if (it.hit) this.hitboxes.push(it.hit);
        }

        this.drawOverlays(now);
        this.drawBubbles(now);
    }

    private drawAvatarAt(
        ctx: CanvasRenderingContext2D,
        av: Avatar,
        p: { x: number; y: number },
        now: number,
    ) {
        const walking = !!av.next;
        drawAvatar(ctx, p.x, p.y, av.look, {
            dir: av.dir,
            walkFrame: walking ? Math.floor(now / 110) % 4 : -1,
            sitting: av.sitting,
            waving: now < av.waveUntil,
            danceFrame: av.dancing && !walking ? Math.floor(now / 180) % 4 : -1,
        });
    }

    private drawWalls() {
        const { ctx } = this;
        const { colors, door } = this.room;
        const poly = (pts: Array<{ x: number; y: number }>, fill: string) => {
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
            ctx.closePath();
            ctx.fillStyle = fill;
            ctx.fill();
        };
        const t = WALL_THICK;
        const isDoor = (x: number, y: number) => x === door.x && y === door.y;
        // De deurtegel telt niet mee: de muur loopt gewoon door met een opening op de plek van de deur
        const firstInRow = (x: number, y: number) =>
            this.heights[y]
                .slice(0, x)
                .every((z, i) => z === undefined || isDoor(i, y));
        const firstInCol = (x: number, y: number) =>
            this.heights
                .slice(0, y)
                .every((row, j) => row[x] === undefined || isDoor(x, j));
        const hasLeftWall = (x: number, y: number) =>
            this.tileZ(x, y) !== undefined && !isDoor(x, y) && firstInRow(x, y);

        this.heights.forEach((row, y) =>
            row.forEach((z, x) => {
                if (z === undefined || isDoor(x, y)) return;
                const base = z * LEVEL_H - FLOOR_THICK;

                // Linkermuur: langs de linkerboven-rand van de eerste tegel in een rij
                if (firstInRow(x, y)) {
                    if (isDoor(x - 1, y)) {
                        // Donkere deuropening met muur erboven
                        poly(
                            [
                                iso(x, y, base),
                                iso(x, y + 1, base),
                                iso(x, y + 1, 84),
                                iso(x, y, 84),
                            ],
                            "#0F1E3A",
                        );
                        poly(
                            [
                                iso(x, y, 84),
                                iso(x, y + 1, 84),
                                iso(x, y + 1, WALL_TOP),
                                iso(x, y, WALL_TOP),
                            ],
                            colors.wallLeft,
                        );
                    } else {
                        poly(
                            [
                                iso(x, y, base),
                                iso(x, y + 1, base),
                                iso(x, y + 1, WALL_TOP),
                                iso(x, y, WALL_TOP),
                            ],
                            colors.wallLeft,
                        );
                        // Plint
                        poly(
                            [
                                iso(x, y, base),
                                iso(x, y + 1, base),
                                iso(x, y + 1, 6),
                                iso(x, y, 6),
                            ],
                            shade(colors.wallLeft, -0.12),
                        );
                    }
                    poly(
                        [
                            iso(x - t, y, WALL_TOP),
                            iso(x - t, y + 1, WALL_TOP),
                            iso(x, y + 1, WALL_TOP),
                            iso(x, y, WALL_TOP),
                        ],
                        shade(colors.wallLeft, 0.35),
                    );
                    // Eind van de muur: zichtbare dikte
                    if (!hasLeftWall(x, y + 1))
                        poly(
                            [
                                iso(x - t, y + 1, base),
                                iso(x, y + 1, base),
                                iso(x, y + 1, WALL_TOP),
                                iso(x - t, y + 1, WALL_TOP),
                            ],
                            shade(colors.wallLeft, -0.2),
                        );
                }

                // Rechtermuur: langs de rechterboven-rand van de eerste tegel in een kolom
                if (firstInCol(x, y)) {
                    poly(
                        [
                            iso(x, y, base),
                            iso(x + 1, y, base),
                            iso(x + 1, y, WALL_TOP),
                            iso(x, y, WALL_TOP),
                        ],
                        colors.wallRight,
                    );
                    poly(
                        [
                            iso(x, y, base),
                            iso(x + 1, y, base),
                            iso(x + 1, y, 6),
                            iso(x, y, 6),
                        ],
                        shade(colors.wallRight, -0.12),
                    );
                    poly(
                        [
                            iso(x, y - t, WALL_TOP),
                            iso(x + 1, y - t, WALL_TOP),
                            iso(x + 1, y, WALL_TOP),
                            iso(x, y, WALL_TOP),
                        ],
                        shade(colors.wallRight, 0.4),
                    );
                    if (firstInRow(x, y))
                        poly(
                            [
                                iso(x - t, y - t, WALL_TOP),
                                iso(x, y - t, WALL_TOP),
                                iso(x, y, WALL_TOP),
                                iso(x - t, y, WALL_TOP),
                            ],
                            shade(colors.wallRight, 0.4),
                        );
                    if (
                        this.tileZ(x + 1, y) === undefined ||
                        !firstInCol(x + 1, y)
                    )
                        poly(
                            [
                                iso(x + 1, y - t, base),
                                iso(x + 1, y, base),
                                iso(x + 1, y, WALL_TOP),
                                iso(x + 1, y - t, WALL_TOP),
                            ],
                            shade(colors.wallRight, -0.25),
                        );
                }
            }),
        );
    }

    private drawFloor(doorOnly: boolean) {
        const { ctx } = this;
        const { colors, door } = this.room;
        const tiles: Array<{ x: number; y: number; z: number }> = [];
        this.heights.forEach((row, y) =>
            row.forEach((z, x) => {
                if (
                    z !== undefined &&
                    (x === door.x && y === door.y) === doorOnly
                )
                    tiles.push({ x, y, z });
            }),
        );
        tiles.sort((a, b) => a.x + a.y - (b.x + b.y));

        const quad = (
            pts: Array<{ x: number; y: number }>,
            fill: string,
            stroke?: string,
        ) => {
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
            ctx.closePath();
            ctx.fillStyle = fill;
            ctx.fill();
            if (stroke) {
                ctx.strokeStyle = stroke;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        };

        for (const { x, y, z } of tiles) {
            const top = z * LEVEL_H;
            const fill = (x + y) % 2 ? colors.floorB : colors.floorA;
            // Zijkanten: waar de buur lager ligt of ontbreekt (vloerdikte / traptrede)
            const below = (nx: number, ny: number) => {
                const nz = this.tileZ(nx, ny);
                return nz === undefined ? -FLOOR_THICK : nz * LEVEL_H;
            };
            const bl = below(x, y + 1);
            if (bl < top)
                quad(
                    [
                        iso(x, y + 1, top),
                        iso(x + 1, y + 1, top),
                        iso(x + 1, y + 1, bl),
                        iso(x, y + 1, bl),
                    ],
                    shade(colors.floorB, -0.18),
                );
            const br = below(x + 1, y);
            if (br < top)
                quad(
                    [
                        iso(x + 1, y, top),
                        iso(x + 1, y + 1, top),
                        iso(x + 1, y + 1, br),
                        iso(x + 1, y, br),
                    ],
                    shade(colors.floorB, -0.32),
                );
            quad(
                [
                    iso(x, y, top),
                    iso(x + 1, y, top),
                    iso(x + 1, y + 1, top),
                    iso(x, y + 1, top),
                ],
                fill,
                shade(colors.floorB, -0.08),
            );
        }
    }

    private drawTileCursor() {
        const t = this.hoverTile;
        if (!t || this.hoverAvatarId) return;
        const z = (this.tileZ(t.x, t.y) ?? 0) * LEVEL_H;
        const { ctx } = this;
        ctx.beginPath();
        const pts = [
            iso(t.x, t.y, z),
            iso(t.x + 1, t.y, z),
            iso(t.x + 1, t.y + 1, z),
            iso(t.x, t.y + 1, z),
        ];
        ctx.moveTo(pts[0].x, pts[0].y);
        for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
        ctx.closePath();
        ctx.fillStyle = "rgba(47, 107, 255, 0.18)";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#FFFFFF";
        ctx.stroke();
    }

    /** Naamlabel bij hover, pijltje bij selectie, "…" bij typen. */
    private drawOverlays(now: number) {
        const { ctx } = this;
        for (const av of this.avatars) {
            const p = this.avatarPos(av);
            const headY = p.y - AVATAR_HEAD;
            if (now < av.typingUntil) {
                const dots = Math.floor(now / 300) % 4;
                this.roundRect(
                    p.x + 8,
                    headY - 18,
                    28,
                    16,
                    8,
                    "#FFFFFF",
                    "#0F1E3A",
                );
                ctx.fillStyle = "#0F1E3A";
                for (let i = 0; i < 3; i++) {
                    ctx.globalAlpha = i < dots ? 1 : 0.3;
                    ctx.fillRect(p.x + 14 + i * 6, headY - 11, 3, 3);
                }
                ctx.globalAlpha = 1;
            }
            if (av.id === this.selectedId) {
                const bob = Math.sin(now / 180) * 3;
                ctx.beginPath();
                ctx.moveTo(p.x - 7, headY - 22 + bob);
                ctx.lineTo(p.x + 7, headY - 22 + bob);
                ctx.lineTo(p.x, headY - 13 + bob);
                ctx.closePath();
                ctx.fillStyle = "#FFB627";
                ctx.fill();
                ctx.strokeStyle = "#0F1E3A";
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            if (av.id === this.hoverAvatarId) {
                ctx.font =
                    '700 11px "Plus Jakarta Sans", system-ui, sans-serif';
                const tw = ctx.measureText(av.name).width;
                this.roundRect(
                    p.x - tw / 2 - 7,
                    p.y + 6,
                    tw + 14,
                    18,
                    9,
                    "rgba(15, 30, 58, 0.85)",
                );
                ctx.fillStyle = "#FFFFFF";
                ctx.textBaseline = "middle";
                ctx.textAlign = "center";
                ctx.fillText(av.name, p.x, p.y + 15.5);
                ctx.textAlign = "left";
            }
        }
    }

    private drawBubbles(now: number) {
        const { ctx } = this;
        ctx.textBaseline = "middle";
        for (const b of this.bubbles) {
            ctx.font = '700 11px "Plus Jakarta Sans", system-ui, sans-serif';
            const nameW = ctx.measureText(`${b.name}: `).width;
            ctx.font = "500 11px Inter, system-ui, sans-serif";
            const textW = ctx.measureText(b.text).width;
            const w = nameW + textW + 20;
            const x = Math.round(b.x - w / 2);
            const y = Math.round(b.y - b.offset);
            const fadeHigh = (420 - b.offset) / 120;
            const fadeOld =
                (BUBBLE_LIFETIME_MS - (now - b.born)) / BUBBLE_FADE_MS;
            const alpha = Math.max(0, Math.min(1, fadeHigh, fadeOld));
            ctx.globalAlpha = alpha;
            this.roundRect(
                x,
                y,
                w,
                BUBBLE_H - 4,
                6,
                b.isMe ? "#EAF2FF" : "#FFFFFF",
                "#0F1E3A",
            );
            // Puntje naar de spreker (alleen zolang de ballon nog laag hangt)
            if (b.offset < 4) {
                ctx.beginPath();
                ctx.moveTo(b.x - 5, y + BUBBLE_H - 4.5);
                ctx.lineTo(b.x + 5, y + BUBBLE_H - 4.5);
                ctx.lineTo(b.x, y + BUBBLE_H + 2);
                ctx.closePath();
                ctx.fillStyle = b.isMe ? "#EAF2FF" : "#FFFFFF";
                ctx.fill();
                ctx.strokeStyle = "#0F1E3A";
                ctx.stroke();
                ctx.fillRect(b.x - 4, y + BUBBLE_H - 6, 8, 2);
            }
            ctx.fillStyle = "#0F1E3A";
            ctx.font = '700 11px "Plus Jakarta Sans", system-ui, sans-serif';
            ctx.fillText(`${b.name}: `, x + 10, y + (BUBBLE_H - 4) / 2 + 0.5);
            ctx.font = "500 11px Inter, system-ui, sans-serif";
            ctx.fillStyle = "#4B5B78";
            ctx.fillText(b.text, x + 10 + nameW, y + (BUBBLE_H - 4) / 2 + 0.5);
            ctx.globalAlpha = 1;
        }
    }

    private roundRect(
        x: number,
        y: number,
        w: number,
        h: number,
        r: number,
        fill: string,
        stroke?: string,
    ) {
        const { ctx } = this;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = stroke;
            ctx.stroke();
        }
    }

    // ─── Input ──────────────────────────────────────────────────────────────────

    private toWorld(e: { clientX: number; clientY: number }) {
        const r = this.canvas.getBoundingClientRect();
        const sx = e.clientX - r.left;
        const sy = e.clientY - r.top;
        return {
            sx,
            sy,
            x: (sx - this.cam.x) / this.zoom,
            y: (sy - this.cam.y) / this.zoom,
        };
    }

    private pickHit(x: number, y: number) {
        for (let i = this.hitboxes.length - 1; i >= 0; i--) {
            const h = this.hitboxes[i];
            if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h)
                return h;
        }
    }

    private pickTile(x: number, y: number): Tile | undefined {
        // Voorste tegels eerst (hoogste x + y), zodat verhoogde tegels winnen
        let best: (Tile & { k: number }) | undefined;
        this.heights.forEach((row, ty) =>
            row.forEach((z, tx) => {
                if (z === undefined || !pointInTile(x, y, tx, ty, z * LEVEL_H))
                    return;
                if (!best || tx + ty > best.k)
                    best = { x: tx, y: ty, k: tx + ty };
            }),
        );
        return best && { x: best.x, y: best.y };
    }

    private onPointerDown = (e: PointerEvent) => {
        this.canvas.setPointerCapture(e.pointerId);
        this.drag = {
            sx: e.clientX,
            sy: e.clientY,
            camX: this.cam.x,
            camY: this.cam.y,
            moved: false,
        };
    };

    private onPointerMove = (e: PointerEvent) => {
        if (this.drag) {
            const dx = e.clientX - this.drag.sx;
            const dy = e.clientY - this.drag.sy;
            if (Math.abs(dx) + Math.abs(dy) > 5) {
                this.drag.moved = true;
                this.follow = false; // zelf verslepen → niet meer automatisch volgen
            }
            if (this.drag.moved) {
                this.cam.x = this.drag.camX + dx;
                this.cam.y = this.drag.camY + dy;
                this.canvas.style.cursor = "grabbing";
                return;
            }
        }
        if (!this.room) return;
        const p = this.toWorld(e);
        const hit = this.pickHit(p.x, p.y);
        this.hoverAvatarId = hit?.type === "avatar" ? hit.id : undefined;
        this.hoverTile = hit ? undefined : this.pickTile(p.x, p.y);
        this.canvas.style.cursor = hit ? "pointer" : "default";
    };

    private onPointerUp = (e: PointerEvent) => {
        const wasDrag = this.drag?.moved;
        this.drag = undefined;
        this.canvas.style.cursor = "default";
        if (wasDrag || !this.room) return;
        const p = this.toWorld(e);
        const hit = this.pickHit(p.x, p.y);
        if (hit?.type === "avatar") {
            this.select(this.avatars.find((a) => a.id === hit.id) ?? null);
            return;
        }
        if (hit?.type === "furni") {
            const f = this.furni.find((x) => x.id === hit.id)!;
            // Stoel/bank: meteen gaan zitten. Spel (schaakbord, arcadekast, …): aan een vrije stoel ernaast gaan zitten.
            // Meubels tonen geen infopaneel (alleen avatars doen dat).
            this.select(null);
            const info = FURNI_INFO[f.kind];
            if (info.seat || info.game) {
                this.useFurni(f.id);
                if (f.kind === "chess") this.events.onChess?.(f.id);
                else if (f.kind === "cardtable") this.events.onCards?.(f.id);
                else if (info.game) this.events.onArcade?.(f.id);
            }
            return;
        }
        const tile = this.pickTile(p.x, p.y);
        if (tile) {
            this.select(null);
            if (tile.x !== this.me.x || tile.y !== this.me.y || this.me.next)
                this.walkTo(this.me, tile);
        }
    };

    private onPointerLeave = () => {
        this.hoverTile = undefined;
        this.hoverAvatarId = undefined;
    };

    private onWheel = (e: WheelEvent) => {
        e.preventDefault();
        // Trackpads sturen tientallen events per gebaar → max. één zoomstap per 150 ms
        if (performance.now() - this.lastWheel < 150) return;
        this.lastWheel = performance.now();
        const r = this.canvas.getBoundingClientRect();
        this.zoomBy(e.deltaY < 0 ? 1 : -1, {
            x: e.clientX - r.left,
            y: e.clientY - r.top,
        });
    };

    private select(target: Avatar | Furni | null) {
        let sel: Selection = null;
        if (target && "look" in target) {
            sel = {
                type: "avatar",
                id: target.id,
                name: target.name,
                motto: target.motto,
                look: target.look,
                isMe: target.isMe,
            };
        } else if (target) {
            const info = FURNI_INFO[target.kind];
            sel = {
                type: "furni",
                id: target.id,
                kind: target.kind,
                name: info.name,
                description: info.description,
                canSit: !!info.seat,
            };
        }
        this.selectedId = sel?.type === "avatar" ? sel.id : undefined;
        this.events.onSelect?.(sel);
    }
}
