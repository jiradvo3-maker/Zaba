// Jednoduchý zvukový engine postavený na Web Audio API (žádné externí soubory)
class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicNodes = null;
    const saved = localStorage.getItem('zaba_sound_enabled');
    if (saved !== null) this.enabled = saved === '1';
  }

  _ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setEnabled(v) {
    this.enabled = v;
    localStorage.setItem('zaba_sound_enabled', v ? '1' : '0');
    if (!v) this.stopMusic();
  }

  _env(gainNode, t0, attack, decay, peak, sustainLevel, dur) {
    const g = gainNode.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0, t0);
    g.linearRampToValueAtTime(peak, t0 + attack);
    g.linearRampToValueAtTime(sustainLevel, t0 + attack + decay);
    g.linearRampToValueAtTime(0, t0 + dur);
  }

  _tone({ freq = 440, type = 'sine', dur = 0.2, vol = 0.3, freqEnd = null, delay = 0 }) {
    if (!this.enabled) return;
    const ctx = this._ensureCtx();
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + dur);
    this._env(gain, t0, 0.01, dur * 0.3, vol, vol * 0.4, dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  _noise({ dur = 0.3, vol = 0.25, delay = 0, filterFreq = 1200 }) {
    if (!this.enabled) return;
    const ctx = this._ensureCtx();
    const t0 = ctx.currentTime + delay;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t0);
  }

  jump() { this._tone({ freq: 420, freqEnd: 720, type: 'triangle', dur: 0.12, vol: 0.25 }); }
  click() { this._tone({ freq: 300, type: 'square', dur: 0.05, vol: 0.15 }); }

  hit() {
    this._tone({ freq: 220, freqEnd: 60, type: 'sawtooth', dur: 0.4, vol: 0.35 });
    this._noise({ dur: 0.25, vol: 0.3, filterFreq: 400 });
  }

  splash() {
    this._noise({ dur: 0.35, vol: 0.25, filterFreq: 800 });
    this._tone({ freq: 200, freqEnd: 100, type: 'sine', dur: 0.3, vol: 0.2 });
  }

  levelComplete() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => this._tone({ freq: f, type: 'triangle', dur: 0.22, vol: 0.28, delay: i * 0.1 }));
  }

  gameOver() {
    const notes = [392, 349.2, 293.7, 220];
    notes.forEach((f, i) => this._tone({ freq: f, type: 'sawtooth', dur: 0.35, vol: 0.22, delay: i * 0.16 }));
  }

  timeWarning() { this._tone({ freq: 880, type: 'square', dur: 0.08, vol: 0.15 }); }

  victoryFanfare() {
    const notes = [523.25, 523.25, 523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const durs =  [0.12, 0.12, 0.12, 0.18, 0.18, 0.35, 0.18, 0.5];
    let t = 0;
    notes.forEach((f, i) => { this._tone({ freq: f, type: 'triangle', dur: durs[i], vol: 0.3, delay: t }); t += durs[i] * 0.85; });
  }

  fireworkBurst() {
    this._noise({ dur: 0.5, vol: 0.3, filterFreq: 2500 + Math.random() * 2000 });
    this._tone({ freq: 800 + Math.random() * 400, freqEnd: 100, type: 'sine', dur: 0.4, vol: 0.15 });
  }

  countdownBeep() { this._tone({ freq: 660, type: 'square', dur: 0.1, vol: 0.2 }); }

  // Jemné ambientní pozadí, dokud je hráč ve hře
  startMusic() {
    if (!this.enabled || this.musicNodes) return;
    const ctx = this._ensureCtx();
    const gain = ctx.createGain();
    gain.gain.value = 0.045;
    gain.connect(ctx.destination);
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 110;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 164.81;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain).connect(gain.gain);
    osc1.connect(gain);
    osc2.connect(gain);
    osc1.start(); osc2.start(); lfo.start();
    this.musicNodes = { gain, osc1, osc2, lfo };
  }

  stopMusic() {
    if (!this.musicNodes) return;
    const { gain, osc1, osc2, lfo } = this.musicNodes;
    const ctx = this.ctx;
    if (ctx) {
      const t = ctx.currentTime;
      gain.gain.linearRampToValueAtTime(0, t + 0.3);
      setTimeout(() => { try { osc1.stop(); osc2.stop(); lfo.stop(); } catch (e) {} }, 350);
    }
    this.musicNodes = null;
  }
}

window.audioManager = new AudioManager();
