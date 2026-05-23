// Procedural SFX engine using the Web Audio API.
// No audio files needed — all sounds are generated in real time.
// SFX only plays when "sounds" category upgrade is equipped.
// BGM is handled separately in GameScene using Phaser's audio loader.

const SoundEngine = (() => {
  let _ctx = null;

  function getCtx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === "suspended") _ctx.resume();
    return _ctx;
  }

  function playAt(freq, type, vol, dur, when, freqEnd) {
    const scaled = vol * (GameState.sfxVolume ?? 1.0);
    if (scaled <= 0) return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, when + dur);
    g.gain.setValueAtTime(scaled, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.start(when);
    osc.stop(when + dur + 0.01);
  }

  return {
    // Call on the first user gesture so the AudioContext can start (browser rule).
    unlock() { getCtx(); },

    // ── SFX ───────────────────────────────────────────────────────────────

    playBrickBreak() {
      if (!GameState.getEquipped("sounds")) return;
      const ctx = getCtx();
      const now = ctx.currentTime;
      playAt(300, "square", 0.14, 0.09, now, 80);
    },

    playPaddleHit() {
      if (!GameState.getEquipped("sounds")) return;
      const ctx = getCtx();
      playAt(260, "sine", 0.16, 0.07, ctx.currentTime);
    },

    playPowerup() {
      if (!GameState.getEquipped("sounds")) return;
      const ctx = getCtx();
      const now = ctx.currentTime;
      [440, 550, 660, 880].forEach((f, i) => playAt(f, "square", 0.11, 0.1, now + i * 0.07));
    },

    playLevelClear() {
      if (!GameState.getEquipped("sounds")) return;
      const ctx = getCtx();
      const now = ctx.currentTime;
      [523, 659, 784, 1047].forEach((f, i) => playAt(f, "square", 0.14, 0.13, now + i * 0.1));
    },

    playLifeLost() {
      if (!GameState.getEquipped("sounds")) return;
      const ctx = getCtx();
      const now = ctx.currentTime;
      playAt(220, "sawtooth", 0.18, 0.28, now);
      playAt(140, "sawtooth", 0.18, 0.28, now + 0.22);
    },
  };
})();
