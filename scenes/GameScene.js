// ── constants ──────────────────────────────────────────────────────────────
const PADDLE_W        = 72;
const PADDLE_H        = 12;
const PADDLE_Y_OFFSET = 40;
const PADDLE_SPEED    = 420;

const BALL_R          = 8;
const BALL_SPEED_BASE = 300;

const BRICK_W         = 50;
const BRICK_H         = 20;
const BRICK_GAP       = 4;
const BRICK_TOP       = 86;
const BRICK_COIN_VALUE = 5;

const STARTING_LIVES  = 3;

// ── visual upgrade look-up tables ──────────────────────────────────────────
const PADDLE_TINTS = {
  paddle_red:   0xff4444,
  paddle_blue:  0x4499ff,
  paddle_gold:  0xffcc00,
  paddle_flame: 0xff6611,
};

const BG_COLORS = {
  bg_blue:   0x071828,
  bg_purple: 0x130a28,
  bg_space:  0x000008,
};

const BRICK_TINTS = {
  brick_blue:  0x4499ff,
  brick_green: 0x44cc55,
  // brick_rainbow handled row-by-row
};

const RAINBOW_COLORS = [
  0xff4444, 0xff9933, 0xffee33,
  0x44dd44, 0x33aaff, 0xaa44ff, 0xff44aa,
];

// ── default brick colors ───────────────────────────────────────────────────
const COLOR_BRICK_NORMAL  = 0x888888;
const COLOR_BRICK_HARD    = 0x4477bb;
const COLOR_BRICK_CRACKED = 0x886644;

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  // ── create ────────────────────────────────────────────────────────────────
  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this._paddleY = H - PADDLE_Y_OFFSET;

    GameState.load();
    this.coins = GameState.coins;
    this.lives  = GameState.lives;
    this.level  = GameState.level;

    this.ballLaunched  = false;
    this.moveDir       = 0;
    this.gameActive    = true;
    this.transitioning = false;

    this._currentPowerupId = null;
    this._shieldActive     = false;
    this._stickyUses       = 0;
    this._ballStuck        = false;
    this._coinBoostMult    = 1;
    this._fireballActive   = false;
    this._lasersActive     = false;
    this._extraBalls       = [];

    this.physics.world.setBoundsCollision(true, true, true, false);
    this._makeTextures();

    // ── paddle ──
    this.paddle = this.physics.add.image(W / 2, this._paddleY, "paddle");
    this.paddle.setImmovable(true);
    this.paddle.body.allowGravity = false;

    // ── ball ──
    this.ball = this.physics.add.image(
      W / 2, this._paddleY - PADDLE_H / 2 - BALL_R, "ball"
    );
    this.ball.body.allowGravity = false;
    this.ball.body.setCollideWorldBounds(true);
    this.ball.body.setBounce(1);

    // ── bricks ──
    this.bricks = this.physics.add.staticGroup();
    this._buildBricksForLevel(this.level);

    // Two colliders — one for normal play, one for fireball pass-through
    this._brickCollider = this.physics.add.collider(
      this.ball, this.bricks, this._onBrick, null, this
    );
    this._brickOverlap = this.physics.add.overlap(
      this.ball, this.bricks, this._onBrickFireball, null, this
    );
    this._brickOverlap.active = false;

    this.physics.add.collider(this.ball, this.paddle, this._onPaddle, null, this);

    // ── HUD ──
    this._buildHUD();
    this._setupInput();

    // ── listen for UpgradeScene events ──
    this.events.on("doNextLevel", this._nextLevel, this);
    this.events.on("resume", this._onResume, this);

    // ── apply saved visual upgrades ──
    this._applyVisualUpgrades();

    // ── start BGM if owned ──
    this._bgmTrack = null;
    this._startBGM();

    // ── activate starter powerup (if any, e.g. from winning last run) ──
    if (GameState.activeTempPowerup) {
      this.time.delayedCall(400, () => {
        if (GameState.activeTempPowerup) {
          this._activatePowerup(GameState.activeTempPowerup.id);
        }
      });
    }

  }

  // ── textures ───────────────────────────────────────────────────────────
  _makeTextures() {
    this._makeTex("paddle", g => {
      g.fillStyle(0xffffff);
      g.fillRoundedRect(0, 0, PADDLE_W, PADDLE_H, 5);
    }, PADDLE_W, PADDLE_H);

    this._makeTex("ball", g => {
      g.fillStyle(0xffffff);
      g.fillCircle(BALL_R, BALL_R, BALL_R);
    }, BALL_R * 2, BALL_R * 2);

    this._makeBrickTex("brick_normal",  COLOR_BRICK_NORMAL);
    this._makeBrickTex("brick_hard",    COLOR_BRICK_HARD);
    this._makeBrickTex("brick_cracked", COLOR_BRICK_CRACKED);

    this._makeTex("laser", g => {
      g.fillStyle(0xff4400);
      g.fillRect(0, 0, 4, 18);
    }, 4, 18);
  }

  _makeTex(key, drawFn, w, h) {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ add: false });
    drawFn(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  _makeBrickTex(key, color) {
    this._makeTex(key, g => {
      g.fillStyle(color);
      g.fillRoundedRect(0, 0, BRICK_W, BRICK_H, 3);
    }, BRICK_W, BRICK_H);
  }

  // ── brick grid ────────────────────────────────────────────────────────
  _buildBricksForLevel(levelNum) {
    const levelData = LEVELS[levelNum - 1];
    const W = this.scale.width;
    const cols = levelData.rows[0].length;
    const totalW = cols * (BRICK_W + BRICK_GAP) - BRICK_GAP;
    const startX = (W - totalW) / 2 + BRICK_W / 2;

    levelData.rows.forEach((rowStr, rowIdx) => {
      for (let col = 0; col < rowStr.length; col++) {
        const hp = parseInt(rowStr[col], 10);
        if (!hp) continue;
        const x = startX + col * (BRICK_W + BRICK_GAP);
        const y = BRICK_TOP + rowIdx * (BRICK_H + BRICK_GAP);
        const brick = this.bricks.create(x, y, hp >= 2 ? "brick_hard" : "brick_normal");
        brick.hp    = hp;
        brick.maxHp = hp;
        brick.rowIdx = rowIdx;
      }
    });
  }

  // ── visual upgrades ───────────────────────────────────────────────────
  _applyVisualUpgrades() {
    const eq = GameState.equippedUpgrades;

    // Paddle tint
    const paddleTint = eq.paddle ? PADDLE_TINTS[eq.paddle] : null;
    paddleTint ? this.paddle.setTint(paddleTint) : this.paddle.clearTint();

    // Flame paddle particles
    if (this._flameEmitter) { this._flameEmitter.destroy(); this._flameEmitter = null; }
    if (eq.paddle === "paddle_flame") {
      this._flameEmitter = this.add.particles(0, 0, "ball", {
        follow: this.paddle,
        followOffset: { x: 0, y: -10 },
        speed: { min: 30, max: 70 },
        scale: { start: 0.25, end: 0 },
        alpha: { start: 0.9, end: 0 },
        lifespan: 350,
        frequency: 25,
        tint: [0xff6600, 0xff3300, 0xffaa00],
        angle: { min: -110, max: -70 },
      }).setDepth(5);
    }

    // Background
    const bgColor = eq.background ? BG_COLORS[eq.background] : 0x1a1a1a;
    this.cameras.main.setBackgroundColor(bgColor);

    // Star field for space
    if (this._starField) { this._starField.destroy(); this._starField = null; }
    if (eq.background === "bg_space") {
      const W = this.scale.width;
      const H = this.scale.height;
      const gfx = this.add.graphics().setDepth(0);
      for (let i = 0; i < 60; i++) {
        const a = Phaser.Math.FloatBetween(0.3, 1.0);
        const s = Phaser.Math.Between(1, 2);
        gfx.fillStyle(0xffffff, a);
        gfx.fillRect(
          Phaser.Math.Between(0, W),
          Phaser.Math.Between(0, H),
          s, s
        );
      }
      this._starField = gfx;
    }

    // Brick tints
    this._applyBrickTints();
  }

  _applyBrickTints() {
    const brickUpgrade = GameState.getEquipped("brick");
    this.bricks.getChildren().forEach(b => {
      if (!brickUpgrade) { b.clearTint(); return; }
      if (brickUpgrade === "brick_rainbow") {
        b.setTint(RAINBOW_COLORS[b.rowIdx % RAINBOW_COLORS.length]);
      } else if (BRICK_TINTS[brickUpgrade]) {
        b.setTint(BRICK_TINTS[brickUpgrade]);
      }
    });
  }

  // ── HUD ───────────────────────────────────────────────────────────────
  _buildHUD() {
    const W = this.scale.width;

    this.add.rectangle(W / 2, 24, W, 48, 0x000000, 0.5).setDepth(9);

    this.livesText = this.add
      .text(14, 10, this._livesStr(), {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "16px", color: "#ff6b6b",
      }).setDepth(10);

    this.coinsText = this.add
      .text(14, 28, this._coinsStr(), {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "14px", color: "#ffd34a",
      }).setDepth(10);

    this.levelText = this.add
      .text(W / 2, 10, this._levelStr(), {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "13px", color: "#aaaaaa",
      }).setOrigin(0.5, 0).setDepth(10);

    // ── Shop icon ──
    const shopBg = this.add
      .rectangle(W - 63, 24, 38, 34, 0x1a2f55)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });
    this.add.text(W - 63, 24, "SHOP", {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "10px", color: "#88aaff", align: "center",
    }).setOrigin(0.5).setDepth(11);
    shopBg.on("pointerdown", () => this._openShop("pause"));
    shopBg.on("pointerover", () => shopBg.setFillStyle(0x274480));
    shopBg.on("pointerout",  () => shopBg.setFillStyle(0x1a2f55));

    // ── Settings icon ──
    const setBg = this.add
      .rectangle(W - 21, 24, 38, 34, 0x1a1a33)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });
    this.add.text(W - 21, 24, "⚙", {
      fontFamily: "Arial, sans-serif",
      fontSize: "18px", color: "#8888bb",
    }).setOrigin(0.5).setDepth(11);
    setBg.on("pointerdown", () => this._openSettings());
    setBg.on("pointerover", () => setBg.setFillStyle(0x2a2a55));
    setBg.on("pointerout",  () => setBg.setFillStyle(0x1a1a33));

    // Powerup status bar (hidden until a powerup is active)
    this.powerupBar = this.add
      .text(W / 2, 50, "", {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "12px", color: "#ffcc44",
        backgroundColor: "#221100",
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5, 0)
      .setDepth(10)
      .setVisible(false);

    this.hintText = this.add
      .text(W / 2, this._paddleY - 34, "tap to launch", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px", color: "#555555",
      }).setOrigin(0.5).setDepth(10);
  }

  _updateHUD() {
    this.livesText.setText(this._livesStr());
    this.coinsText.setText(this._coinsStr());
    this.levelText.setText(this._levelStr());
  }

  _livesStr()  { return "♥ ".repeat(Math.max(this.lives, 0)).trim() || "☆"; }
  _coinsStr()  { return `${this.coins} ¢`; }
  _levelStr()  {
    const name = LEVELS[this.level - 1]?.name ?? "";
    return `LVL ${this.level} — ${name.toUpperCase()}`;
  }
  _ballSpeed() { return BALL_SPEED_BASE * (LEVELS[this.level - 1]?.speedMult ?? 1.0); }

  // ── input ─────────────────────────────────────────────────────────────
  _setupInput() {
    this.input.on("pointerdown", (p, hit) => {
      SoundEngine.unlock(); // satisfies browser autoplay policy on first tap
      if (hit?.length > 0) return;
      if (!this.gameActive || this.transitioning) return;
      if (this._lasersActive) {
        // During lasers, taps just move the paddle
        this.moveDir = p.x < this.scale.width / 2 ? -1 : 1;
        return;
      }
      if (!this.ballLaunched) { this._launch(); return; }
      this.moveDir = p.x < this.scale.width / 2 ? -1 : 1;
    });

    this.input.on("pointermove", (p) => {
      if (!this.gameActive || this.transitioning || !p.isDown) return;
      if (!this.ballLaunched && !this._lasersActive) return;
      this.moveDir = p.x < this.scale.width / 2 ? -1 : 1;
    });

    this.input.on("pointerup", () => { this.moveDir = 0; });
  }

  _launch() {
    this._ballStuck  = false;
    this.ballLaunched = true;
    this.hintText.setVisible(false);
    const speed = this._ballSpeed();
    const angle = Phaser.Math.DegToRad(Phaser.Math.Between(-50, -130));
    this.ball.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  // ── collision ─────────────────────────────────────────────────────────
  _onPaddle(ball, paddle) {
    this._lastPaddleHit = this.time.now; // used by tunneling guard

    // Re-ignite fireball when ball hits paddle (if timer still running)
    if (this._fireballActive) {
      this._brickCollider.active = false;
      this._brickOverlap.active  = true;
    }

    // Sticky paddle: catch the ball
    if (this._currentPowerupId === "sticky" && this._stickyUses > 0) {
      this._stickyUses--;
      this._ballStuck = true;
      this.ballLaunched = false; // so next tap calls _launch() to release
      ball.body.setVelocity(0, 0);
      if (this.hintText) this.hintText.setVisible(true);
      if (this._stickyUses <= 0) {
        // All charges spent — clear powerup now; ball still needs one more tap to relaunch
        this._currentPowerupId = null;
        GameState.activeTempPowerup = null;
        GameState.save();
        this.powerupBar.setVisible(false);
      } else {
        this._updatePowerupBar();
      }
      return;
    }

    SoundEngine.playPaddleHit();
    const speed = this._ballSpeed();
    const norm  = Phaser.Math.Clamp((ball.x - paddle.x) / (PADDLE_W / 2), -0.95, 0.95);
    const angle = Phaser.Math.DegToRad(-90 + norm * 65);
    ball.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  _onBrick(ball, brick) {
    this._breakBrick(brick, 1);
  }

  _onBrickFireball(ball, brick) {
    // Fireball pass-through — ball doesn't deflect, brick just dies
    if (!this._fireballActive) return;
    this._breakBrick(brick, brick.hp); // instant kill regardless of hp
  }

  _breakBrick(brick, damage) {
    brick.hp -= damage;
    if (brick.hp <= 0) {
      const lvl  = LEVELS[this.level - 1];
      const mult = (lvl?.coinMult ?? 1) * this._coinBoostMult;
      this.coins += Math.round(BRICK_COIN_VALUE * mult);
      GameState.coins = this.coins;
      GameState.save();
      this.coinsText.setText(this._coinsStr());
      SoundEngine.playBrickBreak();
      brick.destroy();
      if (this.bricks.countActive() === 0 && !this.transitioning) {
        this._levelClear();
      }
    } else {
      brick.setTexture("brick_cracked");
      brick.refreshBody();
      // Preserve the tint after texture swap
      const brickUpgrade = GameState.getEquipped("brick");
      if (brickUpgrade) {
        if (brickUpgrade === "brick_rainbow") {
          brick.setTint(RAINBOW_COLORS[brick.rowIdx % RAINBOW_COLORS.length]);
        } else if (BRICK_TINTS[brickUpgrade]) {
          brick.setTint(BRICK_TINTS[brickUpgrade]);
        }
      }
    }
  }

  // ── powerup system ───────────────────────────────────────────────────
  _activatePowerup(id) {
    this._deactivatePowerup(); // clear old one first
    this._currentPowerupId = id;
    GameState.activeTempPowerup = { id };
    GameState.save();

    SoundEngine.playPowerup();
    switch (id) {
      case "shield":    this._activateShield();    break;
      case "sticky":    this._activateSticky();    break;
      case "coinboost": this._activateCoinBoost(); break;
      case "multiball": this._activateMultiball(); break;
      case "fireball":  this._activateFireball();  break;
      case "lasers":    this._activateLasers();    break;
    }
  }

  _deactivatePowerup() {
    if (!this._currentPowerupId) return;
    const id = this._currentPowerupId;
    this._currentPowerupId = null;
    GameState.activeTempPowerup = null;
    GameState.save();

    if (id === "fireball")  this._deactivateFireball();
    if (id === "lasers")    this._deactivateLasers();
    if (id === "multiball") this._deactivateMultiball();
    if (id === "coinboost") {
      this._coinBoostMult = 1;
      this._coinBoostTimer?.destroy();
    }
    this._shieldActive = false;
    this._stickyUses   = 0;
    this.powerupBar.setVisible(false);
  }

  // ── shield ──────────────────────────────────────────────────────────
  _activateShield() {
    this._shieldActive = true;
    this._showPowerupMsg("🛡  SHIELD READY");
    this._updatePowerupBar();
  }

  // ── sticky paddle ───────────────────────────────────────────────────
  _activateSticky() {
    this._stickyUses = 3;
    this._showPowerupMsg("🟢  STICKY PADDLE  (3×)");
    this._updatePowerupBar();
  }

  // ── coin boost ──────────────────────────────────────────────────────
  _activateCoinBoost() {
    this._coinBoostMult = 2;
    this._showPowerupMsg("🪙  COIN BOOST  2×");
    this._coinBoostTimer = this.time.delayedCall(25000, () => {
      this._coinBoostMult = 1;
      this._currentPowerupId = null;
      GameState.activeTempPowerup = null;
      GameState.save();
      this.powerupBar.setVisible(false);
    });
    this._updatePowerupBar();
  }

  // ── multi-ball ──────────────────────────────────────────────────────
  _activateMultiball() {
    this._showPowerupMsg("🔵  MULTI-BALL!");
    // Only spawn extras if ball is in play
    if (this.ballLaunched) this._spawnExtraBalls();
    this._multiballTimer = this.time.delayedCall(20000, () => this._deactivateMultiball());
    this._updatePowerupBar();
  }

  _spawnExtraBalls() {
    const speed = this._ballSpeed();
    for (let i = 0; i < 2; i++) {
      const b = this.physics.add.image(
        this.ball.x + (i === 0 ? -15 : 15),
        this.ball.y,
        "ball"
      );
      b.body.allowGravity = false;
      b.body.setCollideWorldBounds(true);
      b.body.setBounce(1);
      const angle = Phaser.Math.DegToRad(Phaser.Math.Between(-50, -130));
      b.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.physics.add.collider(b, this.paddle, this._onPaddle, null, this);
      this.physics.add.collider(b, this.bricks,  this._onBrick,  null, this);
      this._extraBalls.push(b);
    }
  }

  _deactivateMultiball() {
    this._extraBalls.forEach(b => b.destroy());
    this._extraBalls = [];
    this._multiballTimer?.destroy();
    this.powerupBar.setVisible(false);
  }

  // ── fireball ────────────────────────────────────────────────────────
  _activateFireball() {
    this._fireballActive = true;
    this.ball.setTint(0xff6600);
    this._brickCollider.active = false;
    this._brickOverlap.active  = true;
    this._showPowerupMsg("🔥  FIREBALL!");
    this._fireballTimer = this.time.delayedCall(30000, () => this._deactivateFireball());
    this._updatePowerupBar();
  }

  _deactivateFireball() {
    this._fireballActive       = false;
    this._brickCollider.active = true;
    this._brickOverlap.active  = false;
    this.ball.clearTint();
    this._fireballTimer?.destroy();
    this.powerupBar.setVisible(false);
  }

  // ── lasers ───────────────────────────────────────────────────────────
  _activateLasers() {
    this._lasersActive = true;
    this.ball.setVisible(false);
    this.ball.body.setEnable(false);
    this.ballLaunched = false;

    this._laserGroup = this.physics.add.group();
    this._laserBrickOverlap = this.physics.add.overlap(
      this._laserGroup, this.bricks, this._onLaserBrick, null, this
    );

    this._laserEmitter = this.time.addEvent({
      delay: 80,
      loop: true,
      callback: this._fireLaserBurst,
      callbackScope: this,
    });

    this._laserTimer = this.time.delayedCall(5000, () => this._deactivateLasers());
    this._showPowerupMsg("⚡  LASERS!");
    this._updatePowerupBar();
  }

  _fireLaserBurst() {
    if (!this._lasersActive) return;
    [-PADDLE_W / 3, PADDLE_W / 3].forEach(dx => {
      const laser = this._laserGroup.create(
        this.paddle.x + dx, this._paddleY - PADDLE_H, "laser"
      );
      laser.body.setVelocity(0, -700);
      laser.body.allowGravity = false;
    });
  }

  _onLaserBrick(laserGroup, brick) {
    // laserGroup is the group, but Phaser passes the individual item
    const laser = laserGroup;
    laser.destroy();
    this._breakBrick(brick, 1);
  }

  _deactivateLasers() {
    this._lasersActive = false;
    this._laserEmitter?.destroy();
    this._laserBrickOverlap?.destroy();
    this._laserGroup?.clear(true, true);
    this._laserTimer?.destroy();
    this.ball.setVisible(true);
    this.ball.body.setEnable(true);
    this._resetBall();
    this._currentPowerupId = null;
    GameState.activeTempPowerup = null;
    GameState.save();
    this.powerupBar.setVisible(false);
  }

  // ── powerup HUD helpers ──────────────────────────────────────────────
  _showPowerupMsg(msg) {
    const W = this.scale.width;
    const H = this.scale.height;
    const t = this.add
      .text(W / 2, H / 2 - 60, msg, {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "20px",
        color: "#ffcc44",
        backgroundColor: "#221100",
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(25);
    this.tweens.add({
      targets: t,
      alpha: 0,
      y: t.y - 40,
      duration: 1800,
      ease: "Quad.easeIn",
      onComplete: () => t.destroy(),
    });
  }

  _updatePowerupBar() {
    if (!this._currentPowerupId) { this.powerupBar.setVisible(false); return; }
    const labels = {
      shield:    "🛡 SHIELD READY",
      sticky:    `🟢 STICKY  ${this._stickyUses}×`,
      coinboost: "🪙 COINS ×2",
      multiball: "🔵 MULTI-BALL",
      fireball:  "🔥 FIREBALL",
      lasers:    "⚡ LASERS",
    };
    this.powerupBar.setText(labels[this._currentPowerupId] ?? "");
    this.powerupBar.setVisible(true);
  }

  // ── BGM ───────────────────────────────────────────────────────────────
  _startBGM() {
    const id = GameState.getEquipped("bgm");
    if (!id) return;
    if (this._bgmTrack?.isPlaying) return; // already playing something
    this._stopBGM();
    this._bgmTrack = this.sound.add(id, { loop: true, volume: 0.22 * (GameState.bgmVolume ?? 1.0) });
    this._bgmTrack.play();
  }

  _stopBGM() {
    if (this._bgmTrack) {
      this._bgmTrack.stop();
      this._bgmTrack.destroy();
      this._bgmTrack = null;
    }
  }

  _syncBGM() {
    const id = GameState.getEquipped("bgm");
    if (!id) { this._stopBGM(); return; }
    // If a different track is now equipped, restart with the new one
    const currentKey = this._bgmTrack?.key;
    if (currentKey !== id) {
      this._stopBGM();
      this._startBGM();
    }
  }

  // ── shop ─────────────────────────────────────────────────────────────
  _openShop(reason) {
    if (this.transitioning && reason === "pause") return;
    this.transitioning = true;

    // Put ball back on paddle so player can relaunch after the shop closes
    this._resetBall();

    // Destroy any extra balls — they'll be re-spawned if multiball is still active
    this._extraBalls.forEach(b => b.destroy());
    this._extraBalls = [];

    GameState.coins = this.coins;
    GameState.lives  = this.lives;
    GameState.level  = this.level;
    GameState.save();
    this.scene.launch("UpgradeScene", { reason });
    this.scene.pause();
  }

  _openSettings() {
    if (!this.gameActive) return;
    GameState.save();
    this.scene.launch("SettingsScene");
    this.scene.pause();
  }

  _onResume() {
    const prevCoins = this.coins;
    this.coins = GameState.coins;
    this.lives  = GameState.lives;
    this._updateHUD();
    this._applyVisualUpgrades();
    this._syncBGM();
    this.transitioning = false;

    // Check if a new temp powerup was bought
    const pending = GameState.activeTempPowerup;
    if (pending && pending.id !== this._currentPowerupId) {
      this._activatePowerup(pending.id);
    }
  }

  // ── level flow ────────────────────────────────────────────────────────
  _levelClear() {
    this.transitioning = true;
    this.ball.body.setVelocity(0, 0);
    this._extraBalls.forEach(b => b.body.setVelocity(0, 0));
    SoundEngine.playLevelClear();
    this._clearOverlays = [];

    const W = this.scale.width;
    const H = this.scale.height;
    const isWin = this.level >= LEVELS.length;

    this._clearOverlays.push(
      this.add.text(W / 2, H / 2, isWin ? "YOU WIN!" : `LEVEL ${this.level} CLEAR!`, {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "30px",
        color: isWin ? "#ffd700" : "#7CFC00",
      }).setOrigin(0.5).setDepth(20)
    );

    if (isWin) {
      this.time.delayedCall(1500, () => this._gameWin());
    } else {
      this._clearOverlays.push(
        this.add.text(W / 2, H / 2 + 44, "opening shop...", {
          fontFamily: "Arial, sans-serif",
          fontSize: "15px", color: "#aaaaaa",
        }).setOrigin(0.5).setDepth(20)
      );
      this.time.delayedCall(900, () => this._openShop("between_levels"));
    }
  }

  _nextLevel() {
    this.level += 1;
    GameState.level = this.level;
    GameState.save();

    if (this._clearOverlays) {
      this._clearOverlays.forEach(t => t.destroy());
      this._clearOverlays = [];
    }

    // Clean up extra balls from previous level
    this._extraBalls.forEach(b => b.destroy());
    this._extraBalls = [];

    this.bricks.clear(true, true);
    this._buildBricksForLevel(this.level);
    this._applyBrickTints();
    this._resetBall();
    this.transitioning = false;
    this.ballLaunched  = false;
    this._updateHUD();

    // Re-spawn extra balls if multiball is still running
    if (this._currentPowerupId === "multiball") {
      this._updatePowerupBar();
      // Extra balls will spawn on first launch via _launch override — keep it simple
    }

    this.tweens.add({
      targets: this.levelText,
      scaleX: 1.4, scaleY: 1.4,
      duration: 200, yoyo: true, ease: "Quad.easeOut",
    });
  }

  _gameWin() {
    this._stopBGM();
    this.scene.launch("WinScene");
    this.scene.pause();
  }

  _loseLife() {
    if (this.transitioning) return;

    // Shield: absorb the hit
    if (this._shieldActive) {
      this._shieldActive     = false;
      this._currentPowerupId = null;
      GameState.activeTempPowerup = null;
      GameState.save();
      this.powerupBar.setVisible(false);
      this._showPowerupMsg("🛡  SHIELD SAVED YOU!");
      this._resetBall();
      return;
    }

    SoundEngine.playLifeLost();
    this.lives -= 1;
    GameState.lives = this.lives;
    GameState.save();
    this.livesText.setText(this._livesStr());

    // Destroy extra balls on life loss
    this._extraBalls.forEach(b => b.destroy());
    this._extraBalls = [];

    if (this.lives <= 0) { this._gameOver(); return; }
    this._resetBall();
  }

  _resetBall() {
    this._ballStuck   = false;
    this.ballLaunched = false;
    this.ball.setVisible(true);
    this.ball.body.setEnable(true);
    this.ball.body.setVelocity(0, 0);
    this.ball.x = this.paddle.x;
    this.ball.y = this._paddleY - PADDLE_H / 2 - BALL_R;
    if (this.hintText) this.hintText.setVisible(true);
  }

  _gameOver() {
    this.gameActive = false;
    this.ball.body.setVelocity(0, 0);
    this._deactivatePowerup();
    this._stopBGM();
    const finalLevel = this.level;
    GameState.fullReset();
    this.scene.launch("GameOverScene", { finalLevel });
    this.scene.pause();
  }

  // ── update loop ───────────────────────────────────────────────────────
  update(_, delta) {
    if (!this.gameActive) return;

    const W  = this.scale.width;
    const dt = delta / 1000;

    // Move paddle
    if (this.moveDir !== 0) {
      this.paddle.x = Phaser.Math.Clamp(
        this.paddle.x + this.moveDir * PADDLE_SPEED * dt,
        PADDLE_W / 2, W - PADDLE_W / 2
      );
      this.paddle.body.reset(this.paddle.x, this._paddleY);
    }

    // Ball stuck to paddle (sticky powerup)
    if (this._ballStuck) {
      this.ball.x = this.paddle.x;
      this.ball.y = this._paddleY - PADDLE_H / 2 - BALL_R;
      // Tap (non-UI) releases the stuck ball
      // Handled via _launch() already; _ballStuck cleared in _launch
      return;
    }

    if (!this.ballLaunched) {
      this.ball.x = this.paddle.x;
      this.ball.y = this._paddleY - PADDLE_H / 2 - BALL_R;
      return;
    }

    // Fireball: disable pass-through when ball is heading down
    if (this._fireballActive) {
      const goingDown = this.ball.body.velocity.y > 0;
      this._brickCollider.active = goingDown;
      this._brickOverlap.active  = !goingDown;
    }

    // Tunneling guard: if physics missed the paddle, catch it manually
    const paddleTop = this._paddleY - PADDLE_H / 2;
    const msSinceBounce = this.time.now - (this._lastPaddleHit ?? 0);
    if (
      msSinceBounce > 120 &&
      this.ball.body.velocity.y > 0 &&
      this.ball.y >= paddleTop - BALL_R &&
      this.ball.y <= paddleTop + PADDLE_H &&
      Math.abs(this.ball.x - this.paddle.x) < PADDLE_W / 2 + BALL_R
    ) {
      this.ball.y = paddleTop - BALL_R - 1;
      this._onPaddle(this.ball, this.paddle);
    }

    // Main ball fell off screen → lose a life
    if (this.ball.y > this.scale.height + 40) {
      this._loseLife();
    }

    // Cleanup extra balls that fell off screen (no life lost)
    for (let i = this._extraBalls.length - 1; i >= 0; i--) {
      if (this._extraBalls[i].y > this.scale.height + 40) {
        this._extraBalls[i].destroy();
        this._extraBalls.splice(i, 1);
      }
    }

    // Cleanup laser bullets that flew off the top
    if (this._laserGroup) {
      this._laserGroup.getChildren().forEach(l => {
        if (l.y < -20) l.destroy();
      });
    }
  }
}
