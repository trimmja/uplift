// Global save/load for Uplift. All game code reads/writes through GameState.
// Data is persisted to localStorage automatically on every change.

const SAVE_KEY = "uplift_v1";

const GameState = {
  coins: 1000,
  lives: 3,
  level: 1,
  ownedUpgrades: [],      // array of upgrade IDs (permanent)
  equippedUpgrades: {},   // { paddle: 'paddle_red', brick: 'brick_blue', background: null, ... }
  activeTempPowerup: null, // { id } or null
  bgmVolume: 1.0,         // 0–1 multiplier, persists across resets
  sfxVolume: 1.0,

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      this.coins = d.coins ?? 1000;
      this.lives = d.lives ?? 3;
      this.level = d.level ?? 1;
      this.ownedUpgrades = d.ownedUpgrades ?? [];
      this.equippedUpgrades = d.equippedUpgrades ?? {};
      this.activeTempPowerup = d.activeTempPowerup ?? null;
      this.bgmVolume = d.bgmVolume ?? 1.0;
      this.sfxVolume = d.sfxVolume ?? 1.0;
    } catch (e) {
      console.warn("Uplift: failed to load save", e);
    }
  },

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        coins: this.coins,
        lives: this.lives,
        level: this.level,
        ownedUpgrades: this.ownedUpgrades,
        equippedUpgrades: this.equippedUpgrades,
        activeTempPowerup: this.activeTempPowerup,
        bgmVolume: this.bgmVolume,
        sfxVolume: this.sfxVolume,
      }));
    } catch (e) {
      console.warn("Uplift: failed to save", e);
    }
  },

  // Full wipe — used on game over
  fullReset() {
    this.coins = 1000;
    this.lives = 3;
    this.level = 1;
    this.ownedUpgrades = [];
    this.equippedUpgrades = {};
    this.activeTempPowerup = null;
    localStorage.removeItem(SAVE_KEY);
  },

  // Win reset — keep permanent upgrades + equipped state + coins, restart level 1
  prestigeReset(freeStarterPowerupId) {
    this.lives = 3;
    this.level = 1;
    this.activeTempPowerup = freeStarterPowerupId ? { id: freeStarterPowerupId } : null;
    this.save();
  },

  hasUpgrade(id) {
    return this.ownedUpgrades.includes(id);
  },

  getEquipped(category) {
    return this.equippedUpgrades[category] ?? null;
  },

  isEquipped(id, category) {
    return this.equippedUpgrades[category] === id;
  },

  equip(id, category) {
    this.equippedUpgrades[category] = id;
    this.save();
  },

  // Buy a permanent upgrade. Auto-equips if first in that category.
  buyPermanent(id, price, category) {
    if (this.coins < price || this.hasUpgrade(id)) return false;
    this.coins -= price;
    this.ownedUpgrades.push(id);
    if (!this.equippedUpgrades[category]) {
      this.equippedUpgrades[category] = id;
    }
    this.save();
    return true;
  },

  // Buy a temp powerup (replaces current active one).
  buyTemp(id, price) {
    if (this.coins < price) return false;
    this.coins -= price;
    this.activeTempPowerup = { id };
    this.save();
    return true;
  },

  // Buy an extra life.
  buyExtraLife(price, maxLives) {
    if (this.coins < price || this.lives >= maxLives) return false;
    this.coins -= price;
    this.lives += 1;
    this.save();
    return true;
  },
};
