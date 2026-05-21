class AudioService {
  private ctx: AudioContext | null = null;
  private music: HTMLAudioElement | null = null;
  private sfxVol = 0.5;
  private musicVol = 0.5;
  private muted = false;
  private enemyShootThrottle = 0;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, endFreq: number, dur: number, type: OscillatorType, vol: number, attack = 0.005, delayMs = 0) {
    if (this.muted) return;
    const play = () => {
      const ctx = this.getCtx();
      const t = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol * this.sfxVol, t + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      gain.connect(ctx.destination);
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + dur + 0.01);
    };
    if (delayMs > 0) setTimeout(play, delayMs); else play();
  }

  private noise(dur: number, vol: number, lowpass = 3000, attack = 0.005, delayMs = 0) {
    if (this.muted) return;
    const play = () => {
      const ctx = this.getCtx();
      const t = ctx.currentTime;
      const bufLen = Math.ceil(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol * this.sfxVol, t + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(t);
    };
    if (delayMs > 0) setTimeout(play, delayMs); else play();
  }

  playShoot() {
    this.tone(900, 1400, 0.09, 'square', 0.25);
  }

  playHit() {
    this.tone(400, 280, 0.1, 'square', 0.28);
    this.noise(0.06, 0.15, 800);
  }

  playPlayerDamage() {
    this.noise(0.22, 0.55, 500, 0.01);
    this.tone(200, 80, 0.32, 'sawtooth', 0.55, 0.01);
  }

  playExplosion() {
    this.noise(0.32, 0.5, 1400, 0.01);
    this.tone(120, 55, 0.28, 'sine', 0.3, 0.01);
  }

  playBomb() {
    this.noise(0.65, 0.9, 2200, 0.01);
    this.tone(80, 190, 0.55, 'sine', 0.65, 0.02, 40);
  }

  playDash() {
    this.tone(620, 95, 0.16, 'sine', 0.38);
  }

  playModeSwitch() {
    this.tone(880, 660, 0.07, 'square', 0.22);
  }

  playSelect() {
    this.tone(660, 880, 0.08, 'sine', 0.28);
  }

  playPowerup() {
    [440, 554, 659, 880].forEach((f, i) => {
      this.tone(f, f * 1.05, 0.2, 'sine', 0.38, 0.01, i * 90);
    });
  }

  playBossTransition() {
    this.noise(0.45, 0.75, 900, 0.01);
    this.tone(110, 440, 0.95, 'sawtooth', 0.58, 0.02, 80);
  }

  playGameOver() {
    [0, 220, 520].forEach((delay, i) => {
      this.tone(330 * Math.pow(0.8, i), 260 * Math.pow(0.8, i), 0.55, 'sawtooth', 0.5, 0.01, delay);
    });
  }

  playVictory() {
    [0, 140, 280, 460].forEach((delay, i) => {
      const freqs = [440, 554, 659, 880];
      this.tone(freqs[i], freqs[i] * 1.06, 0.38, 'sine', 0.5, 0.01, delay);
    });
  }

  playGraze() {
    this.tone(2200, 2800, 0.035, 'sine', 0.07, 0.002);
  }

  playEnemyShoot() {
    const now = Date.now();
    if (now - this.enemyShootThrottle < 130) return;
    this.enemyShootThrottle = now;
    this.tone(350, 240, 0.07, 'sawtooth', 0.12);
  }

  // Backward compatibility — existing GameEngine calls still work
  loadSound(_id: string, _url: string) {}
  playSound(id: string) {
    switch (id) {
      case 'shoot':     this.playShoot(); break;
      case 'hit':       this.playHit(); break;
      case 'bomb':      this.playBomb(); break;
      case 'select':    this.playSelect(); break;
      case 'explosion': this.playExplosion(); break;
    }
  }

  playMusic(url: string, loop = true) {
    if (this.music) this.music.pause();
    this.music = new Audio(url);
    this.music.loop = loop;
    this.music.volume = this.muted ? 0 : this.musicVol;
    this.music.play().catch(() => {});
  }

  stopMusic() {
    if (this.music) { this.music.pause(); this.music = null; }
  }

  setMusicVolume(vol: number) {
    this.musicVol = Math.max(0, Math.min(1, vol));
    if (this.music && !this.muted) this.music.volume = this.musicVol;
  }

  setSfxVolume(vol: number) {
    this.sfxVol = Math.max(0, Math.min(1, vol));
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.music) this.music.volume = muted ? 0 : this.musicVol;
  }
}

export const audioService = new AudioService();
