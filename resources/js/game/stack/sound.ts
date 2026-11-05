import { loadMuted, saveMuted } from "../arcade-mute";

/**
 * Arcadegeluidjes, gesynthetiseerd met WebAudio (geen geluidsbestanden).
 * Standaard zacht; of het geluid uit staat wordt per browser onthouden.
 */

const VOLUME = 0.12;

export class ArcadeSound {
    muted = loadMuted();
    private ctx?: AudioContext;

    setMuted(muted: boolean) {
        this.muted = muted;
        saveMuted(muted);
    }

    /** Blok geplaatst (afgesneden): korte tik, iets hoger naarmate de toren groeit. */
    drop(height: number) {
        this.tone(220 + Math.min(height, 40) * 6, 0.07, "square");
    }

    /** Perfect: oplopend toontje, hoger bij een langere combo. */
    perfect(combo: number) {
        const base = 520 * Math.pow(2, Math.min(combo - 1, 8) / 12);
        this.tone(base, 0.08, "triangle");
        this.tone(base * 1.5, 0.12, "triangle", 0.07);
    }

    gameOver() {
        [392, 330, 262, 196].forEach((f, i) =>
            this.tone(f, 0.16, "sawtooth", i * 0.13, 0.7),
        );
    }

    close() {
        void this.ctx?.close();
    }

    private tone(
        freq: number,
        duration: number,
        type: OscillatorType,
        delay = 0,
        gain = 1,
    ) {
        if (this.muted) {
            return;
        }

        // Pas na een klik/toets mag een browser geluid maken; dit loopt altijd via een input
        this.ctx ??= new AudioContext();
        void this.ctx.resume();
        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const amp = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        amp.gain.setValueAtTime(VOLUME * gain, t);
        amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        osc.connect(amp).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + duration + 0.02);
    }
}
