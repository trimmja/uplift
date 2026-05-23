// UpgradeScene — overlay on top of GameScene.
// Reads/writes GameState directly. Emits 'doNextLevel' to GameScene on close
// when opened between levels.

const TAB_Y    = 68;
const LIST_TOP = 112;
const ITEM_H   = 52;
const HDR_H    = 24;
const MAX_LIVES = 6;

class UpgradeScene extends Phaser.Scene {
  constructor() {
    super("UpgradeScene");
  }

  init(data) {
    this.openReason = data.reason || "pause";
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.activeTab = "permanent";

    // ── dark overlay ─────────────────────────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.9).setDepth(0);

    // ── header bar (two rows: title+coins, then close button) ────────────
    this.add.rectangle(W / 2, TAB_Y / 2, W, TAB_Y, 0x0d0d22).setDepth(1);

    // Row 1: title (left) + coins (right)
    this.add.text(12, 12, "UPGRADES", {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "17px",
      color: "#ffffff",
    }).setDepth(2);

    this.coinsLabel = this.add
      .text(W - 12, 12, `${GameState.coins} ¢`, {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "15px",
        color: "#ffd34a",
      })
      .setOrigin(1, 0)
      .setDepth(2);

    // Row 2: close button (right-aligned, below coins)
    const closeHit = this.add
      .rectangle(W - 40, 44, 68, 26, 0x222244)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    this.add.text(W - 40, 44, "✕  CLOSE", {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "11px",
      color: "#aaaaaa",
    }).setOrigin(0.5).setDepth(3);

    closeHit.on("pointerdown", () => this._close());
    closeHit.on("pointerover", () => closeHit.setFillStyle(0x334466));
    closeHit.on("pointerout",  () => closeHit.setFillStyle(0x222244));

    // ── tabs ─────────────────────────────────────────────────────────────
    this._buildTabs();

    // ── item list ────────────────────────────────────────────────────────
    this._buildList();
  }

  // ── Tabs (built once; highlight updated in place on switch) ──────────────
  _buildTabs() {
    const W = this.scale.width;
    this._tabBgs  = {};
    this._tabTxts = {};

    [["permanent", "PERMANENT"], ["temporary", "TEMPORARY"]].forEach(([tab, label], i) => {
      const x = i === 0 ? W / 4 : (3 * W) / 4;
      const active = tab === this.activeTab;

      const bg = this.add
        .rectangle(x, TAB_Y + 20, W / 2 - 2, 40, active ? 0x2244bb : 0x1a1a33)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });

      const txt = this.add
        .text(x, TAB_Y + 20, label, {
          fontFamily: "Arial Black, Arial, sans-serif",
          fontSize: "13px",
          color: active ? "#ffffff" : "#666688",
        })
        .setOrigin(0.5)
        .setDepth(3);

      // Text itself isn't interactive — the bg rect covers it
      bg.on("pointerdown", () => this._switchTab(tab));
      bg.on("pointerover", () => { if (tab !== this.activeTab) bg.setFillStyle(0x222255); });
      bg.on("pointerout",  () => { if (tab !== this.activeTab) bg.setFillStyle(0x1a1a33); });

      this._tabBgs[tab]  = bg;
      this._tabTxts[tab] = txt;
    });
  }

  _switchTab(tab) {
    if (this.activeTab === tab) return;
    this.activeTab = tab;

    // Update both tab highlights
    for (const t of ["permanent", "temporary"]) {
      const active = t === this.activeTab;
      this._tabBgs[t].setFillStyle(active ? 0x2244bb : 0x1a1a33);
      this._tabTxts[t].setColor(active ? "#ffffff" : "#666688");
    }

    this._buildList();
  }

  // ── Item list ────────────────────────────────────────────────────────────
  _buildList() {
    // Tear down previous scroll handlers and mask before rebuilding
    if (this._scrollHandlers) {
      this.input.off("pointerdown", this._scrollHandlers.down);
      this.input.off("pointermove", this._scrollHandlers.move);
      this.input.off("pointerup",   this._scrollHandlers.up);
      this._scrollHandlers = null;
    }
    if (this._listMaskGfx) { this._listMaskGfx.destroy(); this._listMaskGfx = null; }
    if (this.listContainer) this.listContainer.destroy();

    this.listContainer = this.add.container(0, LIST_TOP).setDepth(2);

    let y = 0;

    if (this.activeTab === "permanent") {
      const catLabels = { paddle: "PADDLE", brick: "BRICKS", background: "BACKGROUND", sounds: "SOUNDS", bgm: "MUSIC" };
      for (const cat of ["paddle", "brick", "background", "sounds", "bgm"]) {
        const items = UPGRADES.permanent.filter(u => u.category === cat);
        y = this._addSectionHeader(catLabels[cat] ?? cat.toUpperCase(), y);
        items.forEach(u => { y = this._addPermItem(u, y); });
      }
    } else {
      y = this._addSectionHeader("POWERUPS", y);
      UPGRADES.temporary.filter(u => !u.isLife).forEach(u => {
        y = this._addTempItem(u, y);
      });
      y = this._addSectionHeader("UTILITY", y);
      UPGRADES.temporary.filter(u => u.isLife).forEach(u => {
        y = this._addTempItem(u, y);
      });
    }

    // Clip list to the visible area between header and footer
    const W = this.scale.width;
    const H = this.scale.height;
    this._listMaskGfx = this.make.graphics({ add: false });
    this._listMaskGfx.fillRect(0, LIST_TOP, W, H - LIST_TOP);
    this.listContainer.setMask(new Phaser.Display.Masks.GeometryMask(this, this._listMaskGfx));

    // Drag-to-scroll when content is taller than the visible area
    const visibleH    = H - LIST_TOP;
    const maxScrollUp = Math.max(0, y - visibleH);
    if (maxScrollUp <= 0) return;

    let startY  = null;
    let startCY = null;
    let didDrag = false;

    const onDown = (p) => {
      if (p.y < LIST_TOP) return;
      startY  = p.y;
      startCY = this.listContainer.y;
      didDrag = false;
    };
    const onMove = (p) => {
      if (startY === null || !p.isDown) return;
      const dy = p.y - startY;
      if (Math.abs(dy) > 5) didDrag = true;
      if (!didDrag) return;
      this.listContainer.y = Phaser.Math.Clamp(
        startCY + dy,
        LIST_TOP - maxScrollUp,
        LIST_TOP
      );
    };
    const onUp = () => { startY = null; };

    this.input.on("pointerdown", onDown);
    this.input.on("pointermove", onMove);
    this.input.on("pointerup",   onUp);
    this._scrollHandlers = { down: onDown, move: onMove, up: onUp };
  }

  _addSectionHeader(label, y) {
    const W = this.scale.width;
    this.listContainer.add([
      this.add.rectangle(W / 2, y + HDR_H / 2, W, HDR_H, 0x111133),
      this.add.text(W / 2, y + HDR_H / 2, `— ${label} —`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        color: "#5566aa",
      }).setOrigin(0.5),
    ]);
    return y + HDR_H;
  }

  _addPermItem(upgrade, y) {
    const W       = this.scale.width;
    const owned   = GameState.hasUpgrade(upgrade.id);
    const equipped = owned && GameState.isEquipped(upgrade.id, upgrade.category);

    // Row background
    this.listContainer.add(
      this.add.rectangle(W / 2, y + ITEM_H / 2, W, ITEM_H - 1, 0x13131e)
    );

    // Name
    this.listContainer.add(
      this.add.text(14, y + 10, upgrade.name, {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "13px",
        color: equipped ? "#44dd44" : owned ? "#aaddaa" : "#ffffff",
      })
    );

    // Description
    this.listContainer.add(
      this.add.text(14, y + 28, upgrade.desc, {
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
        color: "#666677",
      })
    );

    // Right-side action button
    const btnX = W - 50;
    const btnY = y + ITEM_H / 2;

    if (!owned) {
      const canAfford = GameState.coins >= upgrade.price;
      this._addActionButton(
        btnX, btnY,
        `${upgrade.price} ¢`,
        canAfford ? 0x1a4422 : 0x331111,
        canAfford ? "#44dd44" : "#bb3333",
        canAfford,
        () => {
          if (GameState.buyPermanent(upgrade.id, upgrade.price, upgrade.category)) {
            this._refresh();
          }
        }
      );
    } else if (equipped) {
      this._addActionButton(btnX, btnY, "✓  ON", 0x114411, "#44dd44", false, null);
    } else {
      this._addActionButton(
        btnX, btnY, "EQUIP", 0x112244, "#4499ff", true,
        () => { GameState.equip(upgrade.id, upgrade.category); this._refresh(); }
      );
    }

    return y + ITEM_H;
  }

  _addTempItem(upgrade, y) {
    const W        = this.scale.width;
    const isActive = GameState.activeTempPowerup?.id === upgrade.id;
    const isLife   = upgrade.isLife;
    const atMax    = isLife && GameState.lives >= MAX_LIVES;
    const canAfford = GameState.coins >= upgrade.price && !atMax;

    this.listContainer.add(
      this.add.rectangle(W / 2, y + ITEM_H / 2, W, ITEM_H - 1, 0x13131e)
    );

    this.listContainer.add(
      this.add.text(14, y + 10, (isActive ? "▶ " : "") + upgrade.name, {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "13px",
        color: isActive ? "#ffcc44" : "#ffffff",
      })
    );

    this.listContainer.add(
      this.add.text(14, y + 28, upgrade.desc, {
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
        color: "#666677",
      })
    );

    const btnX = W - 50;
    const btnY = y + ITEM_H / 2;

    if (atMax) {
      this._addActionButton(btnX, btnY, "MAX", 0x222233, "#555566", false, null);
    } else {
      this._addActionButton(
        btnX, btnY,
        `${upgrade.price} ¢`,
        canAfford ? 0x1a4422 : 0x331111,
        canAfford ? "#44dd44" : "#bb3333",
        canAfford,
        () => {
          let ok = false;
          if (upgrade.isLife) {
            ok = GameState.buyExtraLife(upgrade.price, MAX_LIVES);
          } else {
            ok = GameState.buyTemp(upgrade.id, upgrade.price);
          }
          if (ok) this._refresh();
        }
      );
    }

    return y + ITEM_H;
  }

  // A single unified action button (price tag + buy in one, or status label)
  _addActionButton(cx, cy, label, bgColor, textColor, interactive, onTap) {
    const btnW = 80, btnH = 36;

    const bg = this.add
      .rectangle(cx, cy, btnW, btnH, bgColor)
      .setStrokeStyle(1, 0x333355);

    const txt = this.add
      .text(cx, cy, label, {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "12px",
        color: textColor,
        align: "center",
      })
      .setOrigin(0.5);

    this.listContainer.add([bg, txt]);

    if (interactive && onTap) {
      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", onTap);
      bg.on("pointerover", () => bg.setFillStyle(Phaser.Display.Color.ValueToColor(bgColor).brighten(20).color));
      bg.on("pointerout",  () => bg.setFillStyle(bgColor));
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  _refresh() {
    this.coinsLabel.setText(`${GameState.coins} ¢`);
    this._buildList();
    this.scene.get("GameScene")._syncBGM();
  }

  _close() {
    // Clean up scroll handlers before stopping the scene
    if (this._scrollHandlers) {
      this.input.off("pointerdown", this._scrollHandlers.down);
      this.input.off("pointermove", this._scrollHandlers.move);
      this.input.off("pointerup",   this._scrollHandlers.up);
      this._scrollHandlers = null;
    }

    const gs = this.scene.get("GameScene");
    gs.coins = GameState.coins;
    gs.lives  = GameState.lives;

    if (this.openReason === "between_levels") {
      gs.events.emit("doNextLevel");
    }

    this.scene.resume("GameScene");
    this.scene.stop();
  }
}
