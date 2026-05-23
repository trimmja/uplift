class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.audio("bgm_basic", "assets/music/bgm_basic.mp3");
    this.load.audio("bgm_200",   "assets/music/bgm_200.mp3");
    this.load.audio("bgm_300",   "assets/music/bgm_300.mp3");
    this.load.audio("bgm_400",   "assets/music/bgm_400.mp3");
  }

  create() {
    this.scene.start("GameScene");
  }
}
