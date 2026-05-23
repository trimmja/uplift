class WinScene extends Phaser.Scene {
  constructor() { super("WinScene"); }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.add.rectangle(W / 2, H / 2, W, H, 0x081408, 1).setDepth(0);

    this.add.text(W / 2, 32, "YOU WIN! 🎉", {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "34px",
      color: "#ffd700",
    }).setOrigin(0.5, 0).setDepth(1);

    this.add.text(W / 2, 78, "Pick a FREE powerup\nfor your next run:", {
      fontFamily: "Arial, sans-serif",
      fontSize: "15px",
      color: "#88ff88",
      align: "center",
    }).setOrigin(0.5, 0).setDepth(1);

    const options = UPGRADES.temporary.filter(u => !u.isLife);
    const startY = 130;
    const itemH  = 68;
    const itemW  = W - 40;
    const leftX  = (W - itemW) / 2 + 12;

    options.forEach((upgrade, i) => {
      const itemY   = startY + i * itemH;
      const centerY = itemY + itemH / 2 - 4;

      const bg = this.add
        .rectangle(W / 2, centerY, itemW, 58, 0x112211)
        .setDepth(1)
        .setInteractive({ useHandCursor: true });

      this.add.text(leftX, itemY + 8, upgrade.name, {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "14px",
        color: "#ffd700",
      }).setDepth(2);

      this.add.text(leftX, itemY + 28, upgrade.desc, {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        color: "#888888",
      }).setDepth(2);

      bg.on("pointerdown", () => this._pick(upgrade.id));
      bg.on("pointerover", () => bg.setFillStyle(0x1e4422));
      bg.on("pointerout",  () => bg.setFillStyle(0x112211));
    });

    const skipY = startY + options.length * itemH + 16;
    const skip = this.add.text(W / 2, skipY, "no thanks — skip", {
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      color: "#444444",
    }).setOrigin(0.5, 0).setDepth(2).setInteractive({ useHandCursor: true });
    skip.on("pointerdown", () => this._pick(null));
    skip.on("pointerover", () => skip.setColor("#777777"));
    skip.on("pointerout",  () => skip.setColor("#444444"));
  }

  _pick(id) {
    GameState.prestigeReset(id);
    this.scene.stop("GameScene");
    this.scene.stop("WinScene");
    this.scene.start("GameScene");
  }
}
