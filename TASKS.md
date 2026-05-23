# Uplift — Remaining Tasks

Last updated: 2026-05-23

## ✅ Done this session (continued)

- Core gameplay (paddle, ball, bricks, lives, coins, HUD)
- 10-level system with progressive difficulty
- Save/persistence via localStorage (GameState)
- Upgrade panel (UpgradeScene) — permanent + temporary tabs, scrollable list
- All 6 powerups: shield, sticky, coinboost, multiball, fireball, lasers
- Permanent visual upgrades: paddle tints/flame, brick tints/rainbow, background colors/space
- Audio system: procedural SFX (sounds_basic upgrade), real BGM tracks (bgm_basic/200/300/400)
- Settings menu (SettingsScene) — BGM/SFX volume sliders, reset game button
- HUD: SHOP icon + ⚙ settings icon in top bar
- Sticky paddle bug fix (ballLaunched = false on catch)
- Coins now kept after winning all 10 levels
- GameOverScene: "GAME OVER" + level reached + "All upgrades lost" + TRY AGAIN button
- WinScene: "YOU WIN! 🎉" + free powerup picker (6 options + skip); chosen powerup activates on restart

---

## 🔲 Task 10 — Polish + Deploy

### Pre-ship fixes (MUST DO before deploy):
1. `data/state.js` — change `coins: 1000` back to `coins: 0` (two places: default + `fullReset()`)
2. `scenes/GameScene.js` — remove the `keydown-N` dev shortcut (~line 131)

### Polish ideas (ask Shepherd which he wants):
- Brick-break particle pop / screen shake (even at level 1 plain colors)
- Level number flash animation on level start (already has a scale tween, could be bigger)
- BGM track names — ask Shepherd what to call each track
- Ball speed feel — ask Shepherd if levels ramp up too fast or too slow
- Any more upgrade tiers Shepherd wants to add

### Deploy steps:
1. Apply pre-ship fixes above
2. `cd /Users/jacobtrimm/projects/uplift && git init`
3. `git add . && git commit -m "Initial commit"`
4. Confirm with Jacob, then: `gh repo create trimmja/uplift --public --source=. --remote=origin --push`
5. GitHub repo Settings → Pages → Deploy from `main` branch, root `/`
6. Live at: `https://trimmja.github.io/uplift/`
7. Test on Shepherd's phone over LAN first (use the IP printed by `start.command`)
