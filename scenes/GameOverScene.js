class GameOverScene extends Phaser.Scene {
  constructor() { super("GameOverScene"); }

  create(data) {
    const W = this.scale.width;
    const H = this.scale.height;
    const finalLevel = data?.finalLevel ?? 1;

    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0505, 1).setDepth(0);

    this.add.text(W / 2, H / 2 - 120, "GAME OVER", {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "40px",
      color: "#ff4747",
    }).setOrigin(0.5).setDepth(1);

    this.add.text(W / 2, H / 2 - 60, `You reached level ${finalLevel}`, {
      fontFamily: "Arial, sans-serif",
      fontSize: "20px",
      color: "#ffaaaa",
    }).setOrigin(0.5).setDepth(1);

    this.add.text(W / 2, H / 2 - 22, "All upgrades lost.", {
      fontFamily: "Arial, sans-serif",
      fontSize: "15px",
      color: "#664444",
    }).setOrigin(0.5).setDepth(1);

    const btnY = H / 2 + 70;
    const btn = this.add
      .rectangle(W / 2, btnY, 210, 56, 0x331111)
      .setDepth(1)
      .setInteractive({ useHandCursor: true });
    this.add.text(W / 2, btnY, "TRY AGAIN", {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "22px",
      color: "#ff7777",
    }).setOrigin(0.5).setDepth(2);

    btn.on("pointerdown", () => {
      this.scene.stop("GameScene");
      this.scene.stop("GameOverScene");
      this.scene.start("GameScene");
    });
    btn.on("pointerover", () => btn.setFillStyle(0x552222));
    btn.on("pointerout",  () => btn.setFillStyle(0x331111));
  }
}
