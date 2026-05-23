# Uplift

A mobile-first brick-breaker browser game with a "boring → beautiful" upgrade arc. Built with Phaser 3 by Jacob and his son Shepherd (lead designer).

## How to play locally

Double-click `start.command`. Then open:

- **On this Mac:** http://localhost:8081
- **On Shepherd's phone:** the LAN IP that prints in the terminal window (phone must be on the same Wi-Fi).

> Don't open `index.html` directly in the browser — Phaser can't load images from `file://`, and the game will look broken. Always go through `start.command`.

## How it plays

- Vertical brick-breaker. Tap and hold the **left** half of the screen to move the paddle left, **right** half to move it right.
- 10 levels per run. Levels get harder. Bricks take 2 hits after level 5.
- Coins drop **automatically** when you break bricks — there's nothing to chase.
- Spend coins in the **Upgrade panel** (auto-opens between levels; also a pause button during play).
- 3 lives total for the whole run. Lose them all → wipe everything. Beat all 10 → keep the look, lose the cash, pick one free powerup.

See `CLAUDE.md` for the full design + upgrade catalog.
