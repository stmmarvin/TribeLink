import { loadMuted, saveMuted } from "../arcade-mute";

/**
 * Wave Rush — geluid, helemaal gesynthetiseerd met WebAudio (geen bestanden, dus
 * ook geen rechten): een motor die meeschaalt met de snelheid, plons, boost,
 * munt en een retro chiptune-loopje. Standaard zacht; mute geldt voor alle arcadespellen.
 */

const MASTER = 0.35;
/** Chiptune: baslijn en arpeggio (Hz) in A-mineur, één stap per achtste noot. */
const BASS = [
    110, 110, 165, 110, 98, 98, 147, 98, 87, 87, 131, 87, 98, 98, 147, 123,
];
const ARP = [
    440, 523, 659, 523, 392, 494, 587, 494, 349, 440, 523, 440, 392, 494, 587,
    659,
];
const STEP_S = 0.16;

export class WaveRushAudio {
    muted = loadMuted();
    private ctx?: AudioContext;
    private master?: GainNode;
    private motor?: {
        osc: OscillatorNode;
        filter: BiquadFilterNode;
        gain: GainNode;
    };
    private noise?: AudioBuffer;
    private musicTimer = 0;
    private nextStep = 0;
    private step = 0;

    /** Na een eerste klik/toets: pas dan mag een browser geluid maken. */
    unlock() {
        if (!this.ctx) this.setup();
        void this.ctx?.resume();
    }

    setMuted(muted: boolean) {
        this.muted = muted;
        saveMuted(muted);
        if (this.master && this.ctx)
            this.master.gain.setTargetAtTime(
                muted ? 0 : MASTER,
                this.ctx.currentTime,
                0.05,
            );
    }

    /** Motor en muziek aan (bij de start van een potje). */
    start() {
        this.unlock();
        if (!this.ctx || this.musicTimer) return;
        this.nextStep = this.ctx.currentTime + 0.05;
        this.musicTimer = window.setInterval(() => this.scheduleMusic(), 50);
    }

    stop() {
        window.clearInterval(this.musicTimer);
        this.musicTimer = 0;
        this.setSpeed(0);
    }

    pause() {
        void this.ctx?.suspend();
    }

    resume() {
        void this.ctx?.resume();
    }

    /** Motorgeluid: hoger en feller naarmate je harder gaat. */
    setSpeed(ratio: number, boosting = false) {
        if (!this.motor || !this.ctx) return;
        const t = this.ctx.currentTime;
        this.motor.osc.frequency.setTargetAtTime(
            48 + ratio * 95 + (boosting ? 35 : 0),
            t,
            0.08,
        );
        this.motor.filter.frequency.setTargetAtTime(
            300 + ratio * 900 + (boosting ? 600 : 0),
            t,
            0.08,
        );
        this.motor.gain.gain.setTargetAtTime(
            ratio > 0 ? 0.05 + ratio * 0.05 : 0,
            t,
            0.1,
        );
    }

    splash() {
        this.burst(0.35, 900, 0.5);
    }

    crash() {
        this.burst(0.5, 300, 0.8);
        this.tone(110, 0.25, "square", 0, 0.3, 55);
    }

    coin() {
        this.tone(988, 0.06, "square", 0, 0.15);
        this.tone(1319, 0.1, "square", 0.06, 0.15);
    }

    boost() {
        this.tone(300, 0.45, "sawtooth", 0, 0.2, 900);
    }

    /** Door een checkpoint: vrolijk oplopend loopje. */
    checkpoint() {
        [659, 784, 988, 1319].forEach((f, i) =>
            this.tone(f, 0.1, "square", i * 0.07, 0.16),
        );
    }

    /** De laatste seconden op de klok. */
    tick() {
        this.tone(1760, 0.05, "square", 0, 0.12);
    }

    trick() {
        [523, 659, 784, 1047].forEach((f, i) =>
            this.tone(f, 0.08, "square", i * 0.06, 0.15),
        );
    }

    gameOver() {
        this.stop();
        [392, 330, 262, 196].forEach((f, i) =>
            this.tone(f, 0.18, "square", i * 0.15, 0.25),
        );
    }

    destroy() {
        this.stop();
        void this.ctx?.close();
    }

    private setup() {
        const ctx = new AudioContext();
        this.ctx = ctx;
        this.master = ctx.createGain();
        this.master.gain.value = this.muted ? 0 : MASTER;
        this.master.connect(ctx.destination);

        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        filter.type = "lowpass";
        gain.gain.value = 0;
        osc.connect(filter).connect(gain).connect(this.master);
        osc.start();
        this.motor = { osc, filter, gain };

        // Witte ruis voor de plons
        this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }

    /** Muziek een stukje vooruit inplannen (preciezer dan elke noot met een timer). */
    private scheduleMusic() {
        if (!this.ctx) return;
        while (this.nextStep < this.ctx.currentTime + 0.2) {
            const i = this.step % BASS.length;
            const delay = this.nextStep - this.ctx.currentTime;
            this.tone(BASS[i], STEP_S * 0.9, "triangle", delay, 0.12);
            if (this.step % 2 === 0 || i > 11)
                this.tone(ARP[i], STEP_S * 0.5, "square", delay, 0.04);
            this.nextStep += STEP_S;
            this.step++;
        }
    }

    private tone(
        freq: number,
        duration: number,
        type: OscillatorType,
        delay = 0,
        gain = 0.2,
        to?: number,
    ) {
        if (!this.ctx || !this.master) return;
        const t = this.ctx.currentTime + Math.max(0, delay);
        const osc = this.ctx.createOscillator();
        const amp = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        if (to) osc.frequency.exponentialRampToValueAtTime(to, t + duration);
        amp.gain.setValueAtTime(gain, t);
        amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        osc.connect(amp).connect(this.master);
        osc.start(t);
        osc.stop(t + duration + 0.02);
    }

    private burst(duration: number, freq: number, gain: number) {
        if (!this.ctx || !this.master || !this.noise) return;
        const t = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const amp = this.ctx.createGain();
        src.buffer = this.noise;
        filter.type = "bandpass";
        filter.frequency.value = freq;
        amp.gain.setValueAtTime(gain, t);
        amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        src.connect(filter).connect(amp).connect(this.master);
        src.start(t);
        src.stop(t + duration);
    }
}
