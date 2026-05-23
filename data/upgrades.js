// All upgrade definitions. Prices and descriptions live here — easy to tune.
//
// Permanent upgrades: bought once, kept across runs (until game over wipes them).
// Temporary powerups: bought per run, one active at a time; new one replaces old.

const UPGRADES = {
  permanent: [
    // ── Paddle ──────────────────────────────────────────────────────────────
    { id: "paddle_red",    name: "Red Paddle",     desc: "Turn your paddle red",             category: "paddle",     price: 50  },
    { id: "paddle_blue",   name: "Blue Paddle",    desc: "Turn your paddle blue",            category: "paddle",     price: 50  },
    { id: "paddle_gold",   name: "Gold Paddle",    desc: "Shiny gold with stripes",          category: "paddle",     price: 200 },
    { id: "paddle_flame",  name: "Flame Paddle",   desc: "Your paddle is on fire 🔥",        category: "paddle",     price: 600 },

    // ── Bricks ──────────────────────────────────────────────────────────────
    { id: "brick_blue",    name: "Blue Bricks",    desc: "All bricks turn blue",             category: "brick",      price: 100 },
    { id: "brick_green",   name: "Green Bricks",   desc: "All bricks turn green",            category: "brick",      price: 100 },
    { id: "brick_rainbow", name: "Rainbow Bricks", desc: "Each row gets its own color",      category: "brick",      price: 400 },

    // ── Background ──────────────────────────────────────────────────────────
    { id: "bg_blue",       name: "Blue Sky",       desc: "A calm blue background",           category: "background", price: 80  },
    { id: "bg_purple",     name: "Deep Purple",    desc: "A rich purple background",         category: "background", price: 80  },
    { id: "bg_space",      name: "Space Scene",    desc: "Stars, planets, the works!",       category: "background", price: 700 },

    // ── Sounds (SFX) ────────────────────────────────────────────────────────
    { id: "sounds_basic",  name: "Basic Sounds",   desc: "8-bit blips for hits & breaks",    category: "sounds",     price: 75  },

    // ── Music (BGM) ─────────────────────────────────────────────────────────
    { id: "bgm_basic", name: "BGM — Track 1", desc: "A chill background loop",      category: "bgm", price: 120 },
    { id: "bgm_200",   name: "BGM — Track 2", desc: "A step up from the basics",    category: "bgm", price: 200 },
    { id: "bgm_300",   name: "BGM — Track 3", desc: "Getting serious now",          category: "bgm", price: 300 },
    { id: "bgm_400",   name: "BGM — Track 4", desc: "The best track in the shop",   category: "bgm", price: 400 },
  ],

  temporary: [
    { id: "shield",     name: "Shield",        desc: "One free save if the ball falls",         price: 80,  durationMs: 0      },
    { id: "sticky",     name: "Sticky Paddle", desc: "Ball sticks so you can aim (3 catches)",  price: 100, durationMs: 0, uses: 3 },
    { id: "multiball",  name: "Multi-Ball",    desc: "3 balls at once for 20 seconds",          price: 200, durationMs: 20000  },
    { id: "coinboost",  name: "Coin Boost 2×", desc: "Double coins from bricks for 25 seconds", price: 200, durationMs: 25000  },
    { id: "lasers",     name: "Lasers",        desc: "Laser fire for 5 seconds",               price: 300, durationMs: 5000   },
    { id: "fireball",   name: "Fireball",      desc: "Ball destroys everything for 30 seconds", price: 400, durationMs: 30000  },
    { id: "extra_life", name: "Extra Life",    desc: "+1 life (max 6 total)",                   price: 250, isLife: true       },
  ],
};

// Rainbow brick colors — one per row, used when "brick_rainbow" is owned.
const RAINBOW_ROW_COLORS = [0xff4444, 0xff9944, 0xffee44, 0x44dd44, 0x4499ff, 0xaa44ff, 0xff66aa];
