import { buildRiderRects, paintRects } from "../draw/avatar";
import type { AvatarLook } from "../types";
import { PLAYER_WIDTH } from "./collision";
import { OBJECT_WIDTH } from "./obstacles";
import { INVULNERABLE_S, JUMP_S } from "./player";
import type { PlayerState } from "./player";
import { JETSKI_RECTS, RIDER_BOUNDS, spriteFor } from "./sprites";
import type { Sprites } from "./sprites";
import { SEGMENT_LENGTH } from "./track";
import type { Track } from "./track";

/**
 * Wave Rush — tekenen op een klein canvas (± 320×180) dat de pagina met
 * `image-rendering: pixelated` opschaalt.
 *
 * Het water is één perspectief-vlak, per scanline berekend (zoals "Mode 7"): per
 * beeldregel onder de horizon volgt de afstand, en per pixel de plek op een
 * golftextuur die naar je toe schuift. Zo is het open zee in plaats van een weg
 * met banden. De segmenten van de baan bepalen nog wel de geometrie: per regel
 * buigt de textuur mee met de bocht, en boeien, poorten, obstakels en decor
 * worden via de segment-projectie geplaatst.
 */

/** Halve breedte van de baan (tussen de boeien) in wereld-eenheden. */
export const ROAD_WIDTH = 620;
/** Lage camera, net achter de jetski. */
export const CAMERA_HEIGHT = 500;
export const DRAW_DISTANCE = 160;
/** Kijkhoek; met boost wordt hij wijder (snelheidsgevoel). */
export const FOV = 100;
export const BOOST_FOV = 122;
export const depthFor = (fov: number) =>
    1 / Math.tan(((fov / 2) * Math.PI) / 180);
/** Afstand camera → jetski: vast (met de normale kijkhoek), zodat botsingen niet met de FOV meeschuiven. */
export const PLAYER_Z = CAMERA_HEIGHT * depthFor(FOV);

/** Golven/heuvels van de baan worden afgezwakt getoond: het water blijft een vlak dat deint. */
const HILL_SCALE = 0.3;
/** Golftextuur: 256×256, tegelbaar; zoveel wereld-eenheden per texel dwars en in de lengte. */
const TEX = 256;
const TEX_X = 26;
const TEX_Z = 48;
/** Vanaf deze afstand is het water op z'n diepst blauw. */
const FAR = 30000;

const NEAR = [38, 196, 210];
const DEEP = [20, 96, 168];
const HAZE = [214, 232, 242];

type Ctx = CanvasRenderingContext2D;

interface Projected {
    /** Midden van de baan en de waterlijn op het scherm aan het begin van het segment. */
    x: number;
    y: number;
    scale: number;
    /** Tot waar (y) sprites op dit segment zichtbaar zijn (golven ervoor kunnen ze verbergen). */
    clip: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    max: number;
    size: number;
    color: string;
}

export interface View {
    track: Track;
    /** Camera-positie langs de baan (wereld-eenheden). */
    position: number;
    player: PlayerState;
    /** 0–1 van de topsnelheid. */
    speedRatio: number;
    cameraDepth: number;
    /** Parallax: hoe ver lucht en eilanden zijn opgeschoven door bochten. */
    skyOffset: number;
    time: number;
}

/** Wolken: x (0–1, herhaalt), hoogte (0–1 van de lucht), grootte. */
const CLOUDS = [
    [0.05, 0.25, 7],
    [0.3, 0.12, 10],
    [0.52, 0.35, 6],
    [0.7, 0.18, 9],
    [0.9, 0.3, 7],
];

export class Renderer {
    width = 320;
    height = 180;
    /** Horizon (midden van de projectie) en pixels per projectie-eenheid, horizontaal en verticaal. */
    private cx = 160;
    private cy = 90;
    private ux = 160;
    private uy = 90;
    private horizon = 90;
    private sunX = 0;

    private image: ImageData;
    private pixels: Uint32Array;
    private texture = makeWaveTexture();
    private projected: Projected[] = Array.from(
        { length: DRAW_DISTANCE },
        () => ({ x: 0, y: 0, scale: 0, clip: 0 }),
    );
    /** Midden van de baan (wereld-x t.o.v. de camera-lijn) aan het begin van elk segment, voor het water. */
    private centre = new Float32Array(DRAW_DISTANCE + 1);
    private rider: HTMLCanvasElement;
    private riderCtx: Ctx;
    private particles: Particle[] = [];
    private flash = 0;
    private landBump = 0;

    constructor(
        private ctx: Ctx,
        private sprites: Sprites,
        private look: AvatarLook,
    ) {
        this.image = ctx.createImageData(this.width, this.height);
        this.pixels = new Uint32Array(this.image.data.buffer);
        this.rider = document.createElement("canvas");
        this.rider.width = RIDER_BOUNDS.right - RIDER_BOUNDS.left + 3;
        this.rider.height = RIDER_BOUNDS.bottom - RIDER_BOUNDS.top + 3;
        this.riderCtx = this.rider.getContext("2d")!;
    }

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
        // Staand scherm (telefoon): iets inzoomen en de horizon wat hoger
        const portrait = height > width;
        this.cx = width / 2;
        this.cy = Math.round(height * (portrait ? 0.4 : 0.46));
        this.ux = portrait ? width * 0.8 : width / 2;
        this.uy = this.ux * 0.5625;
        this.image = this.ctx.createImageData(width, height);
        this.pixels = new Uint32Array(this.image.data.buffer);
    }

    /** Breedte van de jetski-romp op het scherm: dezelfde breedte als waarmee hij botst. */
    private jetskiWidth() {
        return ((PLAYER_WIDTH * ROAD_WIDTH) / CAMERA_HEIGHT) * this.ux;
    }

    /** Schuim en spatwater naast en achter de jetski; meer bij snelheid en in bochten. */
    spray(ratio: number, steer: number, dt: number) {
        const half = this.jetskiWidth() * 0.45;
        const count = Math.round(
            (ratio * 110 + Math.abs(steer) * 90) * dt + Math.random() * 0.7,
        );
        for (let i = 0; i < count; i++) {
            // In een bocht spat het vooral aan de buitenkant op
            const side =
                steer !== 0 && Math.random() < 0.7
                    ? -Math.sign(steer)
                    : Math.random() < 0.5
                      ? -1
                      : 1;
            this.particles.push({
                x: this.cx + side * (half + Math.random() * 4),
                y: this.height - 4 - Math.random() * 3,
                vx: side * (20 + Math.random() * 40 + Math.abs(steer) * 30),
                vy: -20 - Math.random() * 40 * (0.5 + ratio),
                life: 0,
                max: 0.3 + Math.random() * 0.35,
                size: Math.random() < 0.3 ? 2 : 1,
                color: Math.random() < 0.75 ? "#FFFFFF" : "#C7F2FF",
            });
        }
    }

    /** Plons: bij een botsing (met witte flits) of bij het landen na een sprong. */
    splash(kind: "hit" | "land") {
        if (kind === "hit") this.flash = 0.16;
        else this.landBump = 4;
        const half = this.jetskiWidth() * 0.5;
        for (let i = 0; i < (kind === "hit" ? 30 : 40); i++) {
            const side = Math.random() < 0.5 ? -1 : 1;
            this.particles.push({
                x: this.cx + side * Math.random() * half,
                y: this.height - 6,
                vx: side * (30 + Math.random() * 70),
                vy: -40 - Math.random() * 90,
                life: 0,
                max: 0.45 + Math.random() * 0.35,
                size: Math.random() < 0.5 ? 2 : 1,
                color: Math.random() < 0.6 ? "#FFFFFF" : "#7DD3FC",
            });
        }
    }

    update(dt: number) {
        for (const p of this.particles) {
            p.life += dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 260 * dt;
        }
        this.particles = this.particles.filter(
            (p) => p.life < p.max && p.y < this.height + 2,
        );
        this.flash = Math.max(0, this.flash - dt);
        this.landBump = Math.max(0, this.landBump - dt * 14);
    }

    draw(view: View) {
        const { ctx, width, height } = this;
        ctx.imageSmoothingEnabled = false;
        this.project(view);
        this.drawSky(view);
        this.drawWater(view);
        this.drawSprites(view);

        for (const p of this.particles) {
            ctx.globalAlpha = 1 - p.life / p.max;
            ctx.fillStyle = p.color;
            ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        }
        ctx.globalAlpha = 1;

        this.drawPlayer(view);
        if (view.player.boosting) this.drawSpeedLines(view.time);
        if (this.flash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.flash * 2})`;
            ctx.fillRect(0, 0, width, height);
        }
    }

    // ─── Projectie: segmenten → baanmidden en waterlijn op het scherm ───────────

    private project(view: View) {
        const { track, position, player, cameraDepth, speedRatio, time } = view;
        const base = Math.floor(position / SEGMENT_LENGTH);
        const basePercent = (position % SEGMENT_LENGTH) / SEGMENT_LENGTH;
        const here = track.get(
            Math.floor((position + PLAYER_Z) / SEGMENT_LENGTH),
        );
        const herePercent =
            ((position + PLAYER_Z) % SEGMENT_LENGTH) / SEGMENT_LENGTH;
        const playerY =
            (here.y1 + (here.y2 - here.y1) * herePercent) * HILL_SCALE;
        const cameraY = playerY + CAMERA_HEIGHT;
        const cameraX = player.x * ROAD_WIDTH;

        // Camera kantelt mee met de golf onder je, deint en wiebelt een beetje, en zakt even na een landing
        const slope = ((here.y2 - here.y1) * HILL_SCALE) / SEGMENT_LENGTH;
        const pitch = Math.max(-10, Math.min(10, slope * this.uy * 1.2));
        this.horizon =
            this.cy +
            pitch +
            Math.sin(time * 2.2) * 0.8 +
            Math.sin(time * 4.7) * 0.6 * speedRatio +
            this.landBump;

        let maxY = this.height;
        let x = 0;
        let dx = -track.get(base).curve * basePercent;

        for (let n = 0; n < DRAW_DISTANCE; n++) {
            const seg = track.get(base + n);
            const p = this.projected[n];
            this.centre[n] = x;
            const z = seg.index * SEGMENT_LENGTH - position;

            if (z <= 0) {
                p.scale = 0;
            } else {
                const s = cameraDepth / z;
                p.scale = s;
                p.x = this.cx + s * (x - cameraX) * this.ux;
                p.y =
                    this.horizon -
                    s * (seg.y1 * HILL_SCALE - cameraY) * this.uy;
                p.clip = maxY;
                maxY = Math.min(maxY, p.y);
            }

            x += dx;
            dx += seg.curve;
        }
        this.centre[DRAW_DISTANCE] = x;
    }

    // ─── Lucht: kleurverloop, zon, wolken, eilanden aan de horizon (parallax) ───

    private drawSky(view: View) {
        const { ctx, width } = this;
        const horizon = Math.ceil(this.horizon);
        const sky = ctx.createLinearGradient(0, 0, 0, horizon);
        sky.addColorStop(0, "#1D4ED8");
        sky.addColorStop(0.45, "#3B82F6");
        sky.addColorStop(0.82, "#93C5FD");
        sky.addColorStop(1, "#FDE9B5");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, horizon + 1);

        // Zon met gloed; het zonnespoor op het water ligt eronder (drawWater)
        const span = width * 1.6;
        this.sunX =
            ((((width * 0.7 - view.skyOffset * 0.12) % span) + span) % span) -
            width * 0.3;
        const sunY = Math.round(horizon * 0.35);
        const glow = ctx.createRadialGradient(
            this.sunX,
            sunY,
            2,
            this.sunX,
            sunY,
            40,
        );
        glow.addColorStop(0, "rgba(255, 247, 214, 0.9)");
        glow.addColorStop(1, "rgba(255, 247, 214, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(this.sunX - 40, sunY - 40, 80, 80);
        this.disc(this.sunX, sunY, 8, "#FFF7D6");

        for (const [cx, cy, size] of CLOUDS) {
            const x =
                ((((cx * span - view.skyOffset * 0.3) % span) + span) % span) -
                width * 0.3;
            this.cloud(Math.round(x), Math.round(cy * horizon * 0.9 + 4), size);
        }

        this.drawIslands(horizon, view.skyOffset * 0.5, "#4B8DA0", 1, 0.7);
        this.drawIslands(horizon, view.skyOffset * 0.7, "#2F7A6E", 2, 1);
    }

    private disc(cx: number, cy: number, r: number, color: string) {
        this.ctx.fillStyle = color;
        for (let dy = -r; dy <= r; dy++) {
            const half = Math.round(Math.sqrt(r * r - dy * dy));
            this.ctx.fillRect(Math.round(cx - half), cy + dy, half * 2, 1);
        }
    }

    /** Pixelwolk uit drie bolletjes, met een lichtblauwe onderkant. */
    private cloud(x: number, y: number, size: number) {
        const { ctx } = this;
        const puffs: Array<[number, number, number]> = [
            [x, y, size],
            [x + size * 1.3, y + size * 0.35, size * 0.8],
            [x - size * 1.1, y + size * 0.4, size * 0.7],
        ];
        for (const [px, py, r] of puffs) {
            for (let dy = -Math.round(r); dy <= Math.round(r * 0.6); dy++) {
                const half = Math.round(
                    Math.sqrt(Math.max(0, r * r - dy * dy)),
                );
                ctx.fillStyle = dy > r * 0.25 ? "#DCEBFA" : "#FFFFFF";
                ctx.fillRect(
                    Math.round(px - half),
                    Math.round(py + dy),
                    half * 2,
                    1,
                );
            }
        }
    }

    /** Verre eilanden op de horizon: hoogte uit een paar sinussen, dus altijd hetzelfde. */
    private drawIslands(
        horizon: number,
        offset: number,
        color: string,
        seed: number,
        size: number,
    ) {
        const { ctx, width } = this;
        ctx.fillStyle = color;
        for (let x = 0; x < width; x++) {
            const wx = x + offset;
            const h =
                Math.max(
                    0,
                    Math.sin(wx * 0.018 + seed) * 7 +
                        Math.sin(wx * 0.051 + seed * 2) * 4 -
                        4,
                ) * size;
            if (h > 0)
                ctx.fillRect(x, horizon - Math.round(h), 1, Math.round(h) + 1);
        }
    }

    // ─── Water: perspectief-vlak per scanline ───────────────────────────────────

    private drawWater(view: View) {
        const { width, height, pixels, texture, centre } = this;
        const { position, player, cameraDepth, time } = view;
        const base = Math.floor(position / SEGMENT_LENGTH);
        const cameraX = player.x * ROAD_WIDTH;
        const top = Math.max(0, Math.ceil(this.horizon));
        const below = height - this.horizon;
        const hazeRows = below * 0.3;
        const sunX = this.sunX;
        const frame = Math.floor(time * 12);

        for (let y = top; y < height; y++) {
            const dy = y + 0.5 - this.horizon;
            const row = y * width;
            // Afstand tot deze beeldregel, en hoeveel wereld-eenheden één pixel breed is
            const z =
                (cameraDepth * CAMERA_HEIGHT * this.uy) / Math.max(dy, 0.25);
            const step = z / (cameraDepth * this.ux);

            // Baanmidden op deze afstand (bocht), zodat de golven meebuigen met de boeien
            const nf = Math.min(
                DRAW_DISTANCE - 0.001,
                Math.max(0, (position + z) / SEGMENT_LENGTH - base),
            );
            const ni = Math.floor(nf);
            const cl = centre[ni] + (centre[ni + 1] - centre[ni]) * (nf - ni);

            const v = position + z;
            const tv = (Math.floor(v / TEX_Z) & (TEX - 1)) * TEX;
            let u = (-this.cx * step - cl + cameraX) / TEX_X;
            const du = step / TEX_X;

            // Kleur van deze regel: turquoise dichtbij, diepblauw ver weg, deining, nevel aan de horizon
            const t = Math.min(1, z / FAR);
            const deep = Math.sqrt(t);
            const swell = 1 + 0.07 * Math.sin(v * 0.0011 - time * 1.8);
            const haze = Math.max(0, 1 - dy / hazeRows) ** 2;
            const keep = (1 - haze) * swell;
            const r0 = (NEAR[0] + (DEEP[0] - NEAR[0]) * deep) * keep;
            const g0 = (NEAR[1] + (DEEP[1] - NEAR[1]) * deep) * keep;
            const b0 = (NEAR[2] + (DEEP[2] - NEAR[2]) * deep) * keep;
            const hr = HAZE[0] * haze;
            const hg = HAZE[1] * haze;
            const hb = HAZE[2] * haze;
            const contrast = 0.32 * (1 - t) ** 1.5 + 0.05;
            const glintHalf = 3 + dy * 0.45;

            for (let x = 0; x < width; x++) {
                const n = texture[tv + (Math.floor(u) & (TEX - 1))];
                u += du;
                const k = 1 + ((n - 128) / 128) * contrast;
                let r = r0 * k + hr;
                let g = g0 * k + hg;
                let b = b0 * k + hb;
                // Glinstering in het zonnespoor en hier en daar op de golftoppen
                if (
                    (n > 226 &&
                        Math.abs(x - sunX) < glintHalf &&
                        ((n + x + frame) & 3) === 0) ||
                    (n > 250 && t < 0.25)
                ) {
                    r = 255;
                    g = 250;
                    b = 228;
                }
                pixels[row + x] =
                    0xff000000 |
                    (Math.min(255, b) << 16) |
                    (Math.min(255, g) << 8) |
                    Math.min(255, r);
            }
        }

        this.ctx.putImageData(this.image, 0, 0, 0, top, width, height - top);
    }

    // ─── Sprites: boeien, poorten, obstakels, pick-ups en decor, van ver naar dichtbij ──

    private drawSprites(view: View) {
        const { ctx } = this;
        const base = Math.floor(view.position / SEGMENT_LENGTH);

        for (let n = DRAW_DISTANCE - 1; n >= 0; n--) {
            const p = this.projected[n];
            if (p.scale === 0) continue;
            for (const object of view.track.get(base + n).objects) {
                // Een poort blijft staan als je erdoor bent; al het andere verdwijnt
                if (object.taken && object.kind !== "gate") continue;
                const img = this.sprites[spriteFor(object.kind, object.offset)];
                const w =
                    OBJECT_WIDTH[object.kind] * ROAD_WIDTH * p.scale * this.ux;
                if (w < 0.6) continue;
                const h = w * (img.height / img.width);
                const floating =
                    object.kind === "coin" || object.kind === "boost";
                const bob = floating
                    ? Math.sin(view.time * 5 + object.id) * h * 0.15 - h * 0.3
                    : 0;
                const x =
                    p.x +
                    p.scale * object.offset * ROAD_WIDTH * this.ux -
                    w / 2;
                const y = p.y - h + bob + (floating ? 0 : h * 0.08);
                const visible = Math.min(h, p.clip - y);
                if (visible <= 0) continue;
                if (object.kind === "boost") {
                    ctx.globalAlpha = 0.35 + Math.sin(view.time * 8) * 0.15;
                    ctx.fillStyle = "#22D3EE";
                    ctx.fillRect(
                        Math.round(x - w * 0.2),
                        Math.round(y - h * 0.1),
                        Math.round(w * 1.4),
                        Math.round(h * 1.2),
                    );
                    ctx.globalAlpha = 1;
                }
                ctx.drawImage(
                    img,
                    0,
                    0,
                    img.width,
                    Math.max(1, img.height * (visible / h)),
                    Math.round(x),
                    Math.round(y),
                    Math.max(1, Math.round(w)),
                    Math.max(1, Math.round(visible)),
                );
            }
        }
    }

    // ─── De jetski met de hotel-avatar erop ─────────────────────────────────────

    private drawPlayer(view: View) {
        const { ctx, height } = this;
        const { player, time, speedRatio } = view;
        const hull = RIDER_BOUNDS.right - RIDER_BOUNDS.left - 2;
        const scale = this.jetskiWidth() / hull;
        const ox = 1 - RIDER_BOUNDS.left;
        const oy = 1 - RIDER_BOUNDS.top;

        // Jetski + rijder op het tussen-canvas (avatar-pixels), elke frame, want de rijder leunt mee
        const rc = this.riderCtx;
        rc.clearRect(0, 0, this.rider.width, this.rider.height);
        paintRects(rc, JETSKI_RECTS, ox, oy, 1);
        paintRects(rc, buildRiderRects(this.look, player.tilt), ox, oy, 1);

        const progress = player.air > 0 ? 1 - player.air / JUMP_S : 0;
        const lift =
            player.air > 0
                ? Math.sin(progress * Math.PI) *
                  this.rider.height *
                  scale *
                  0.45
                : 0;
        const bob =
            player.air > 0 ? 0 : Math.sin(time * 7) * (0.6 + speedRatio * 0.8);
        const shake =
            player.invulnerable > 0
                ? Math.sin(time * 70) *
                  3 *
                  (player.invulnerable / INVULNERABLE_S)
                : 0;
        const x = this.cx + player.tilt * 5 + shake;
        const y = height - 2 + bob - lift;
        const w = this.jetskiWidth();

        if (player.air > 0) {
            // Schaduw op het water
            ctx.fillStyle = "rgba(15, 30, 58, 0.3)";
            ctx.fillRect(
                Math.round(x - w * 0.4),
                height - 4,
                Math.round(w * 0.8),
                3,
            );
        } else {
            // Schuim waar de romp het water raakt
            ctx.fillStyle = "#FFFFFF";
            for (let i = 0; i < 26; i++) {
                const fx = x + (Math.random() - 0.5) * w * 1.1;
                ctx.fillRect(
                    Math.round(fx),
                    Math.round(height - 1 - Math.random() * 4),
                    Math.random() < 0.5 ? 2 : 1,
                    1,
                );
            }
        }

        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        ctx.rotate(player.tilt * 0.16);
        // Trick: een spin in de lucht (zichtbaar als het omklappen van de sprite)
        if (player.air > 0 && player.airSteer.left && player.airSteer.right) {
            ctx.scale(Math.cos(progress * Math.PI * 4), 1);
        }
        ctx.drawImage(
            this.rider,
            Math.round(-ox * scale),
            Math.round(-(oy + RIDER_BOUNDS.bottom) * scale),
            Math.round(this.rider.width * scale),
            Math.round(this.rider.height * scale),
        );
        ctx.restore();
    }

    private drawSpeedLines(time: number) {
        const { ctx, width, cx } = this;
        const cy = this.horizon;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2 + Math.floor(time * 20) * 0.37;
            const r1 =
                width * (0.3 + ((i * 7 + Math.floor(time * 30)) % 10) * 0.02);
            const r2 = r1 + width * 0.12;
            ctx.moveTo(
                Math.round(cx + Math.cos(a) * r1),
                Math.round(cy + Math.sin(a) * r1 * 0.6),
            );
            ctx.lineTo(
                Math.round(cx + Math.cos(a) * r2),
                Math.round(cy + Math.sin(a) * r2 * 0.6),
            );
        }
        ctx.stroke();
    }
}

/**
 * Tegelbare golftextuur (0–255): een paar sinussen met hele perioden per 256
 * texels, plus wat ruis. Golven lopen schuin en kruisen elkaar, zoals echte zee.
 */
function makeWaveTexture(): Uint8Array {
    const tex = new Uint8Array(TEX * TEX);
    const tau = (Math.PI * 2) / TEX;
    for (let v = 0; v < TEX; v++) {
        for (let u = 0; u < TEX; u++) {
            const a = Math.sin(u * tau * 3 + Math.sin(v * tau * 2) * 1.6);
            const b = Math.sin(v * tau * 9 + u * tau * 2);
            const c = Math.sin((u + v) * tau * 13);
            const noise =
                ((((u * 73856093) ^ (v * 19349663)) >>> 0) % 1000) / 1000 - 0.5;
            const value = 0.5 + a * 0.2 + b * 0.18 + c * 0.08 + noise * 0.14;
            tex[v * TEX + u] = Math.max(
                0,
                Math.min(255, Math.round(value * 255)),
            );
        }
    }
    return tex;
}
