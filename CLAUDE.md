# Uplift — Project Rules for Claude

This file is the source of truth for working on Uplift. Read it first every time.

## Who's building this

- **Jacob** — dad, no coding experience, handles all technical decisions.
- **Shepherd** — Jacob's son, **lead designer**. All design decisions go through him.
- **Different from Jackpot:** Jackpot is Ryder's game (Jacob's other son). Do not mix them up. Uplift is Shepherd's.

## Collaboration rules

- **Always ask Shepherd before making design decisions.** When you'd normally pick a default, ask him instead — colors, themes, level layouts, powerup tuning, art style. Use `AskUserQuestion` or just ask plainly.
- **Talk to Shepherd in simple, fun, kid-friendly language.** No jargon. No long paragraphs. He's a kid — keep it bright and easy.
- **Talk to Jacob like an adult collaborator who doesn't code.** Plain-English tech explanations, no acronyms without unpacking.
- **Validate before claiming done.** Run the server, open the game, click through the change. Don't say "done" until you saw it work.
- **Visual quality matters.** A working-but-ugly game discourages Shepherd.

## Tech stack (do not change without asking)

- **Phaser 3** loaded from CDN (`https://cdn.jsdelivr.net/npm/phaser@3.88.2/dist/phaser.min.js`).
- **Vanilla JavaScript** — no TypeScript, no npm, no bundler, no build step.
- **`localStorage`** for all saves.
- **GitHub Pages** for hosting. **Live at https://trimmja.github.io/uplift/** — auto-deploys on every push to `main` (Pages source = `main` branch, root).
- Local dev: `start.command` runs `python3 -m http.server 8081`.

## How to test changes

**Default = live URL.** After a change merges to `main`, GitHub Pages rebuilds in ~30–60s. Test at https://trimmja.github.io/uplift/ on the Mac or Shepherd's phone. That is the URL Shepherd actually plays — verify there, not on localhost.

**Local dev** (only when you need to iterate before pushing): double-click `start.command`, then open `http://localhost:8081` on the Mac or the printed LAN IP on Shepherd's phone. **Never open `index.html` directly** — browsers block image loads over `file://`.

## ⚠️ Pre-ship checklist (things to revert before deploying)

- `data/state.js` — `coins: 1000` and `fullReset()` coins → change both back to `0`
- `scenes/GameScene.js` — remove the `keydown-N` dev shortcut (clears all bricks instantly)

## Game design — the rules Shepherd locked in

### Format
- **Vertical** mobile portrait. Logical canvas 360×640, scaled to fit window.
- Paddle at the bottom. Ball bounces upward into a brick grid.

### Controls
- **Touch left half** of the screen → paddle moves left.
- **Touch right half** of the screen → paddle moves right.
- (Mouse works the same way for desktop testing.)

### Run structure
- **3 lives** total for the whole 10-level run. Extra lives can be **bought** in the upgrade panel.
- **10 levels per run.** Levels 1–5: 1-hit bricks. Levels 6–10: 2-hit bricks. Ball gets faster each level.

### Coins
- **Auto-awarded** when a brick breaks. Nothing drops. There's nothing to chase.
- Powerups are **never** dropped — bought only.

### Upgrade panel
- Auto-opens between every level. Also accessible via **SHOP** button in HUD any time.
- **PERMANENT** tab and **TEMPORARY** tab. Affordable items green, unaffordable red.
- List scrolls via drag.

### Settings menu
- Accessible via **⚙** button in HUD.
- Contains: BGM Volume slider, SFX Volume slider, Reset Game button (two-tap confirm).
- Volume settings persist across resets (not wiped by fullReset).

### Win / lose
- **Lose all 3 lives** → everything wipes (coins, upgrades, progress). Back to level 1 with nothing.
- **Beat all 10 levels** → keep permanent upgrades AND keep coins. Pick 1 free temporary powerup to start the next run. Game restarts at level 1.

## Upgrade catalog

### Temporary powerups (only ONE active at a time — new replaces old)

| ID | Name | Effect | Price |
|---|---|---|---|
| shield | Shield | One free save if ball falls | 80 |
| sticky | Sticky Paddle | Ball sticks on catch, 3 catches | 100 |
| multiball | Multi-Ball | 3 balls for 20s | 200 |
| coinboost | Coin Boost 2× | Double coins for 25s | 200 |
| lasers | Lasers | Paddle fires lasers for 5s, ball hidden | 300 |
| fireball | Fireball | Ball destroys everything for 30s | 400 |
| extra_life | Extra Life | +1 life (max 6) | 250 |

### Permanent upgrades

| Category | IDs | Prices |
|---|---|---|
| paddle | paddle_red, paddle_blue, paddle_gold, paddle_flame | 50, 50, 200, 600 |
| brick | brick_blue, brick_green, brick_rainbow | 100, 100, 400 |
| background | bg_blue, bg_purple, bg_space | 80, 80, 700 |
| sounds (SFX) | sounds_basic | 75 |
| bgm (music) | bgm_basic, bgm_200, bgm_300, bgm_400 | 120, 200, 300, 400 |

BGM tracks live in `assets/music/`. Names are placeholder ("BGM — Track 1" etc.) — ask Shepherd what to call them.

## File map

```
uplift/
├── index.html             # loads Phaser CDN + all scripts
├── main.js                # Phaser config: [BootScene, GameScene, UpgradeScene, SettingsScene]
├── style.css              # mobile viewport, no scroll, no tap highlights
├── start.command          # double-click → python3 server on :8081
├── CLAUDE.md              # this file
├── TASKS.md               # pending work for next session
├── README.md
├── .gitignore
├── scenes/
│   ├── BootScene.js       # loads assets/music/* then starts GameScene
│   ├── GameScene.js       # core game: paddle, ball, bricks, HUD, all powerups
│   ├── UpgradeScene.js    # shop overlay: permanent + temporary tabs, scrollable
│   ├── SettingsScene.js   # settings overlay: BGM/SFX sliders, reset game
│   ├── GameOverScene.js   # ⬅ NOT YET BUILT (stub is inline in GameScene._gameOver)
│   └── WinScene.js        # ⬅ NOT YET BUILT (stub is inline in GameScene._gameWin)
├── data/
│   ├── state.js           # GameState global: coins, lives, level, upgrades, volumes
│   ├── upgrades.js        # all upgrade definitions + prices
│   ├── levels.js          # 10 level layouts + speedMult/coinMult
│   └── sounds.js          # SoundEngine: procedural Web Audio SFX (no files needed)
└── assets/
    └── music/             # bgm_basic.mp3, bgm_200.mp3, bgm_300.mp3, bgm_400.mp3
```

## Key implementation details (non-obvious things)

- **Ball tunneling guard**: manual check in `GameScene.update()` catches ball if physics misses thin paddle. 120ms debounce via `_lastPaddleHit`.
- **Fireball dual collider**: `_brickCollider` (normal) + `_brickOverlap` (fireball), toggled by ball direction.
- **Visual upgrades**: `setTint()` on paddle/bricks, `cameras.main.setBackgroundColor()` for bg, particle emitter for flame paddle, graphics object for star field.
- **Sticky paddle fix**: on catch, set `ballLaunched = false` so next tap calls `_launch()` to release. `_launch()` clears `_ballStuck`.
- **BGM**: Phaser sound system (`this.sound.add(id, {loop:true})`). Volume = `0.22 * GameState.bgmVolume`. `_syncBGM()` called on shop/settings close.
- **SFX**: Web Audio API in `SoundEngine`. Volume scaled by `GameState.sfxVolume`.
- **Scroll in UpgradeScene**: drag-to-scroll with GeometryMask clipping. Handlers cleaned up on tab switch and close.
- **Scene order**: GameScene ← UpgradeScene or SettingsScene launched on top; GameScene paused. UpgradeScene emits `doNextLevel` event on close if opened between levels.

## Deploy (GitHub Pages)

Already live. Push to `main` → GitHub Pages rebuilds in ~30–60s.

- Repo: https://github.com/trimmja/uplift
- Live: https://trimmja.github.io/uplift/
- Pages source: `main` branch, root folder. HTTPS enforced.

## Open questions for Shepherd

1. BGM track names — currently "BGM — Track 1/2/3/4". What does he want to call them?
2. Multi-ball duration (currently 20s) — happy with that?
3. Sticky paddle catches (currently 3) — happy with that?
4. Coin boost duration (currently 25s) — happy with that?
5. Should brick-break have a tiny particle pop / screen shake even at level 1?
