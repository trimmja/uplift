// SettingsScene — volume sliders + game reset.
// Launched as an overlay on GameScene (which is paused while this is open).

class SettingsScene extends Phaser.Scene {
  constructor() {
    super("SettingsScene");
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ── dark overlay ────────────────────────────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.92).setDepth(0);

    // ── header (two rows, mirrors UpgradeScene) ──────────────────────────────
    this.add.rectangle(W / 2, 34, W, 68, 0x0d0d22).setDepth(1);

    this.add.text(12, 12, "SETTINGS", {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "17px", color: "#ffffff",
    }).setDepth(2);

    const closeHit = this.add
      .rectangle(W - 40, 44, 68, 26, 0x222244)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    this.add.text(W - 40, 44, "✕  CLOSE", {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "11px", color: "#aaaaaa",
    }).setOrigin(0.5).setDepth(3);
    closeHit.on("pointerdown", () => this._close());
    closeHit.on("pointerover", () => closeHit.setFillStyle(0x334466));
    closeHit.on("pointerout",  () => closeHit.setFillStyle(0x222244));

    // ── shared drag state ────────────────────────────────────────────────────
    this._activeDrag = null;
    this.input.on("pointermove", (p) => {
      if (!this._activeDrag || !p.isDown) return;
      this._activeDrag(p);
    });
    this.input.on("pointerup", () => { this._activeDrag = null; });

    // ── sliders ──────────────────────────────────────────────────────────────
    this._addSlider("MUSIC VOLUME", 88, GameState.bgmVolume, (v) => {
      GameState.bgmVolume = v;
      GameState.save();
      const gs = this.scene.get("GameScene");
      if (gs._bgmTrack) gs._bgmTrack.setVolume(0.22 * v);
    });

    this._addSlider("SOUND EFFECTS", 172, GameState.sfxVolume, (v) => {
      GameState.sfxVolume = v;
      GameState.save();
    });

    // ── divider ──────────────────────────────────────────────────────────────
    this.add.rectangle(W / 2, 252, W - 32, 1, 0x1e1e33).setDepth(1);

    // ── danger zone ──────────────────────────────────────────────────────────
    this.add.text(W / 2, 264, "— DANGER ZONE —", {
      fontFamily: "Arial, sans-serif", fontSize: "11px", color: "#553333",
    }).setOrigin(0.5).setDepth(1);

    this._resetConfirming = false;
    const resetBg = this.add
      .rectangle(W / 2, 308, 220, 36, 0x2a0d0d)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    const resetTxt = this.add
      .text(W / 2, 308, "RESET GAME", {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "12px", color: "#883333",
      })
      .setOrigin(0.5).setDepth(3);

    resetBg.on("pointerdown", () => {
      if (!this._resetConfirming) {
        this._resetConfirming = true;
        resetBg.setFillStyle(0x551111);
        resetTxt.setText("TAP AGAIN TO CONFIRM").setColor("#ff4444");
        this.time.delayedCall(3000, () => {
          if (!this._resetConfirming) return;
          this._resetConfirming = false;
          resetBg.setFillStyle(0x2a0d0d);
          resetTxt.setText("RESET GAME").setColor("#883333");
        });
      } else {
        GameState.fullReset();
        this.scene.stop("GameScene");
        this.scene.stop("SettingsScene");
        this.scene.start("GameScene");
      }
    });
    resetBg.on("pointerover", () => resetBg.setFillStyle(this._resetConfirming ? 0x772222 : 0x3a1111));
    resetBg.on("pointerout",  () => resetBg.setFillStyle(this._resetConfirming ? 0x551111 : 0x2a0d0d));
  }

  // ── Slider ──────────────────────────────────────────────────────────────────
  _addSlider(label, y, initialValue, onChange) {
    const W       = this.scale.width;
    const PAD     = 20;
    const PCT_W   = 50;
    const TRACK_X = PAD;
    const TRACK_W = W - PAD * 2 - PCT_W - 8;
    const TRACK_Y = y + 34;
    const FILL_H  = 6;
    const THUMB_W = 16;
    const THUMB_H = 22;

    // Label
    this.add.text(PAD, y, label, {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "12px", color: "#8888aa",
    }).setDepth(2);

    // Track background
    this.add.rectangle(TRACK_X + TRACK_W / 2, TRACK_Y, TRACK_W, FILL_H, 0x222244).setDepth(2);

    // Filled portion — stored so we can resize it on drag
    const startW  = Math.max(1, Math.round(TRACK_W * initialValue));
    const filled  = this.add
      .rectangle(TRACK_X + startW / 2, TRACK_Y, startW, FILL_H, 0x3366cc)
      .setDepth(3);

    // Thumb
    const thumb = this.add
      .rectangle(TRACK_X + Math.round(TRACK_W * initialValue), TRACK_Y, THUMB_W, THUMB_H, 0x5588ff)
      .setDepth(4);

    // Percentage label
    const pctTxt = this.add
      .text(TRACK_X + TRACK_W + 10, TRACK_Y, `${Math.round(initialValue * 100)}%`, {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "12px", color: "#aaaacc",
      })
      .setOrigin(0, 0.5).setDepth(2);

    // Invisible interactive rectangle as hit area (more reliable than Zone)
    const hit = this.add
      .rectangle(TRACK_X + TRACK_W / 2, TRACK_Y, TRACK_W, 44, 0x000000, 0)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });

    const update = (pointer) => {
      const localX = Phaser.Math.Clamp(pointer.x - TRACK_X, 0, TRACK_W);
      const value  = localX / TRACK_W;
      const fw     = Math.max(1, Math.round(localX));
      thumb.x      = TRACK_X + localX;
      filled.x     = TRACK_X + fw / 2;
      filled.setSize(fw, FILL_H);
      pctTxt.setText(`${Math.round(value * 100)}%`);
      onChange(value);
    };

    hit.on("pointerdown", (pointer) => {
      this._activeDrag = update;
      update(pointer);
    });
  }

  // ── Close ───────────────────────────────────────────────────────────────────
  _close() {
    this.scene.resume("GameScene");
    this.scene.stop();
  }
}
