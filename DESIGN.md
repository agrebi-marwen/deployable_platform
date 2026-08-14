# THE TIME PORTAL — Design System (v2 · FINAL)

The single source of truth for the whole project. This overrides the previous CHRONO HUB design system. The platform is **The Time Portal** — a gamified coding-challenge platform by IEEE CS INSAT SBC — and every page (landing, auth, dashboard, challenges, leaderboard) must follow this system.

Reference implementation: `overworld-sample/index5.html` (self-contained static sample of the full landing page, including the dynamic galaxy background).

---

## 1. Design Philosophy & Core Principles

1. **Near-Black Starfield Canvas:** Page base is near-black (`#050505`), layered with a live WebGL galaxy starfield (ported from the main project's `assets/js/galaxy-bg.js`), faint radial glows, and a barely-visible pixel grid. The background stays **dark** so stars and content pop.
2. **5-Color Palette Only:** All design is built from exactly five colors — **Sky Reflection, Dusk Blue, Flame Orange, Tuscan Sun, Onyx**. Semantic roles (success / danger / coins / rarity) map onto these colors; no arbitrary extras. Subtle shade variants of the base colors are allowed for text hierarchy and gradients, but the five palette colors carry the identity.
3. **Chunky Hard Shadows:** Interactive elements and cards use flat, unblurred offset shadows (`box-shadow: 5px 5px 0 #000`, small elements `3px 3px 0 #000`). Hover pushes shadows out; active presses them in.
4. **8-Bit Bevel Framing:** Cards carry a multi-layer bevel — dark inset shadow + subtle light inset highlight + hard offset shadow — giving a tactile handheld-console edge. Sharp corners, no border-radius (except deliberate pill/creams).
5. **Segmented HUD Elements:** Progress bars, stat meters, and leaderboard rows are drawn as distinct pixel blocks rather than single gradient bars — every metric reads as discrete cells.
6. **Editorial Meets 16-Bit Gaming:** Pixel headlines (Press Start 2P) + crisp monospace metadata (VT323) + clean readable body copy (Space Grotesk).
7. **NO FLASHING / BLINKING / GLITCH:** Animations that flash, blink, flicker, pulse, or glitch are forbidden. The only motion allowed is smooth hover transitions (0.15s), the drifting starfield, and button press/hover shadow shifts. Respect `prefers-reduced-motion` (render static, no transitions).

---

## 2. Color Palette & Tokens

### The 5 Colors
| Name | Hex | Role |
| :--- | :--- | :--- |
| Sky Reflection | `#83b5d1` | Brand accent, nav, XP numerals, NEW flags, secondary buttons |
| Dusk Blue | `#345995` | Secondary accent, epic rarity, secondary surfaces |
| Flame Orange | `#fe4e00` | PRIMARY CTAs, legendary/boss, level tags, danger, hero accent |
| Tuscan Sun | `#eec643` | Coins, stars, legendary rarity, gold rewards |
| Onyx | `#141414` | Surfaces, borders, ink text on bright backgrounds |

### Surface Stack (Onyx-derived, darkened for starfield contrast)
| Token | Hex | Usage |
| :--- | :--- | :--- |
| `--bg-abyss` | `#050505` | Page background, empty bar segments |
| `--bg-night` | `#0c0c0c` | Footer, darker surfaces |
| `--bg-panel` | `#161616` | Panels, leaderboard, HUD cards |
| `--bg-card` | `#1d1d1d` | Cards, list rows |
| `--ink` | `#050505` | Text on neon/bright backgrounds |
| `--line` | `#000000` | Borders, hard shadows, keylines |
| `--grid-line` | `rgba(131, 181, 209, 0.03)` | Background pixel grid (near invisible) |

### Accent Token Map
| Token | Value | Usage |
| :--- | :--- | :--- |
| `--neon-cyan` | `#83b5d1` | Sky Reflection — brand, active nav, XP text |
| `--neon-violet` | `#345995` | Dusk Blue — secondary bars, epic |
| `--neon-pink` | `#fe4e00` | Flame Orange — legendary, boss, level tags |
| `--neon-green` | `#83b5d1` | Sky Reflection — XP / success numerals |
| `--neon-yellow` | `#eec643` | Tuscan Sun — coins, star difficulty |
| `--neon-orange` | `#fe4e00` | Flame Orange — streak, danger-progress |
| `--neon-red` | `#fe4e00` | Flame Orange — boss tags, danger |

### Action & Rarity Tokens
| Token | Value | Usage |
| :--- | :--- | :--- |
| `--brand-green` | `#fe4e00` | PRIMARY CTA fill (Flame Orange) |
| `--button-cream` | `#345995` | Secondary button surface (Dusk Blue) |
| `--rarity-common` | `#83b5d1` | Common rarity tag (Sky Reflection) |
| `--rarity-rare` | `#345995` | Rare rarity tag (Dusk Blue) |
| `--rarity-epic` | `#fe4e00` | Epic rarity tag (Flame Orange) |
| `--rarity-legendary` | `#eec643` | Legendary rarity tag (Tuscan Sun) |

### Text Neutrals (Sky-derived shades)
| Token | Value | Usage |
| :--- | :--- | :--- |
| `--text-strong` | `#ffffff` | Headings, emphasis |
| `--text-mid` | `#aabccb` | Body copy, links |
| `--text-dim` | `#6e8296` | Labels, hints, metadata |

---

## 3. Typography & Font Hierarchy

Use pixel-tight rendering (`image-rendering: pixelated;` where applicable, `-webkit-font-smoothing: antialiased`).

### Font Families
* **Display / Headlines / Stats / Titles:** `Press Start 2P` (blocky pixel).
* **Metadata, Tags, Numbers, Navigation:** `VT323` (crisp pixel mono, generous size, `letter-spacing: 0.08em–0.14em`, uppercase).
* **Body Copy:** `Space Grotesk` @ 14px–16px, `line-height: 1.6`, `#aabccb` on dark surfaces.

### Type Scale
* **Hero Title:** Press Start 2P @ 40px, uppercase, **solid colors with layered hard text-shadows** (do NOT use background-clip gradient text — it renders faintly over the starfield). Accent word in solid Flame Orange with a Flame glow.
* **Section Headers:** Press Start 2P @ 20px, uppercase, prefixed with a cyan `▶` mark.
* **HUD Metric Values:** Press Start 2P @ 20px.
* **HUD Labels / Sub-text:** VT323 uppercase @ 15px–18px with letter-spacing.
* **Body:** 15px–16px, `#aabccb` / `#6e8296` muted.

### Hero Title Pattern (approved)
```css
.hero h1 {
  font-family: var(--font-display);
  font-size: 40px;
  text-transform: uppercase;
  color: var(--text-strong);
  text-shadow:
    0 0 22px rgba(131, 181, 209, 0.45),
    4px 4px 0 #000,
    7px 7px 0 rgba(0, 0, 0, 0.55);
}
.hero h1 .grad {
  color: var(--neon-pink);
  text-shadow:
    0 0 26px rgba(254, 78, 0, 0.7),
    4px 4px 0 #000,
    7px 7px 0 rgba(0, 0, 0, 0.55);
}
```

---

## 4. Core Utilities

```css
:root {
  --shadow-hard: 5px 5px 0 #000;
  --shadow-hard-sm: 3px 3px 0 #000;
  --border-thick: 3px solid #000;
  --border-thin: 2px solid #000;
  --font-display: 'Press Start 2P', monospace;
  --font-meta: 'VT323', monospace;
  --font-body: 'Space Grotesk', sans-serif;
}

/* Bevel frame — tactile handheld edge */
.bevel {
  border: 3px solid #000;
  border-radius: 0;
  box-shadow:
    inset -3px -3px 0 rgba(0, 0, 0, 0.45),
    inset 3px 3px 0 rgba(255, 255, 255, 0.07),
    5px 5px 0 #000;
}

/* Segmented pixel-block progress bar */
.seg-bar { display: flex; gap: 3px; }
.seg-bar .seg {
  flex: 1; height: 14px;
  background: #050505;
  border: 2px solid #000;
}
.seg-bar .seg.on      { background: linear-gradient(180deg, #fe4e00, #d94300); }
.seg-bar .seg.on.cyan { background: linear-gradient(180deg, #83b5d1, #6a9cbd); }
.seg-bar .seg.on.violet { background: linear-gradient(180deg, #345995, #2a4a80); }
.seg-bar .seg.half    { background: #eec643; }
```

---

## 5. UI Components & Layout

### 1. Header Navigation
* Sticky, translucent near-black background (`rgba(5, 5, 5, 0.92)`) with blur, bottom keyline.
* **Logo:** Gradient cube mark (Sky Reflection → Dusk Blue) + Press Start 2P text logo, optional VT323 badge (e.g. `IEEE CS INSAT SBC`).
* **Nav Links:** VT323 uppercase, subtle underline/border flash on hover, Sky Reflection border on hover.
* **HUD Pills:** bordered stat chips — e.g. `⚡ 1.2M EP` (Sky Reflection bolt).
* **Primary CTA:** Flame Orange `⚔ Sign Up` button.

### 2. Action Buttons (`.btn`)
```css
.btn {
  font-family: var(--font-meta);
  font-size: 18px;
  text-transform: uppercase;
  color: #fff;
  background: var(--brand-green);        /* Flame Orange */
  border: 3px solid #000;
  box-shadow: 5px 5px 0 #000;
  padding: 10px 22px;
  transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.2s ease;
}
.btn:hover  { transform: translate(-2px, -2px); box-shadow: 7px 7px 0 #000; filter: brightness(1.08); }
.btn:active { transform: translate(2px, 2px);  box-shadow: 2px 2px 0 #000; }
```
Variants: `.btn--cyan` (Sky Reflection bg, ink text), `.btn--pink` (Tuscan Sun bg, ink text — boss/legendary "Fight"), `.btn--cream` (Dusk Blue bg, white text — secondary).

### 3. Player HUD Cards
Three-card row of bevel-framed stat cards, each with an offset `hud-tag` mounted on the top-right border (Flame Orange default; `.cyan` Sky Reflection; `.violet` Dusk Blue). Each card has a VT323 label, a Press Start 2P value, and a segmented pixel-bar.

### 4. Hero Section
Tagline chip (Sky Reflection border/tint), Press Start 2P title (solid white + Flame Orange accent word, layered shadows), subtitle, primary (Flame) + secondary (Dusk Blue) buttons, then the HUD card row.

### 5. Quest / Challenge Grid (Landing "Anomalies")
Responsive cards with rarity tags mounted on the top-left border (`COMMON` / `RARE` / `EPIC` / `LEGENDARY`), optional `NEW` flag top-right (Sky Reflection bg, ink text), VT323 epoch line (Flame Orange), Press Start 2P title, description, difficulty stars (Tuscan Sun filled / dark `#3a3a3a` empty) + label, and a footer row splitting rewards (Tuscan Sun coins + Sky Reflection XP) from the action button. Legendary = Tuscan Sun "Fight" button.

### 6. Leaderboard
Beveled panel with rows: rank + medal (🥇🥈🥉 with subtle top-row gradient tints — Tuscan Sun / Sky Reflection / bronze), player name + level tag (Flame Orange `LV n`), XP/EP value, and a segmented pixel-bar (Sky Reflection → Dusk Blue fill). Hover brightens the row (`filter: brightness(1.12)`).

### 7. Team Section
Beveled cards with a square initials avatar block (Press Start 2P initials in Flame Orange on a dark gradient), name, role (Sky Reflection), and link chips (LinkedIn / Email) that border-highlight on hover.

### 8. Footer
`--bg-night` band with 2fr/1fr/1fr columns, Sky Reflection section labels, and a status pill (`Temporal Core: Operational` with a static Sky Reflection dot). NO pulsing dot.

---

## 6. Background: Live Galaxy Starfield

* Ported from the main project's `assets/js/galaxy-bg.js` — WebGL starfield with slow drift and mouse parallax.
* **Runs in transparent mode** (`alpha: true`, clear color transparent) so the near-black base, faint radial glows, and grid remain visible behind the stars.
* **Disabled on touch / mobile** (`innerWidth <= 600`, touch, `maxTouchPoints > 0`).
* **Reduced motion:** renders a single static frame, no animation loop.
* Canvas: fixed, full-viewport, `pointer-events: none`, `z-index: -10`.
* Tuned values: `density 0.2`, `speed 0.2`, `glowIntensity 0.12`, `saturation 0`, `twinkle 0`, no rotation.

---

## 7. Motion & Feedback

* **Smooth hovers only (0.15s ease):** buttons translate -2px / press +2px with shadow shift; cards lift -3px/-4px; leaderboard rows brighten.
* **NO blink, NO float, NO flicker, NO pulse, NO glitch** anywhere.
* `prefers-reduced-motion: reduce` → `transition: none`, no transforms, static starfield.

---

## 8. Responsive Rules

* `@media (max-width: 760px)`: nav centers, hero title 26px, footer collapses to 1 column, leaderboard drops XP column (2-col grid), HUD row wraps.
* `@media (max-width: 460px)`: team grid single column.

---

## 9. Reference Implementation

See `overworld-sample/index5.html` - the approved self-contained static sample: full landing page (nav, hero + HUD, team, leaderboard, anomalies, footer) in this system, with the live galaxy background.

Dashboard + admin reference: `dashboardX.html` (self-contained Command Center sample) and `admin/admin.html` (live console). See sections 10 and 11.

---

## 10. Admin Console (`.zone` functional layout)

The admin panel is organized into **functional zones**, not tabs. Each zone groups its management panels under a labeled header with a color-coded badge. All zones use the same `panel-card` bevel framing as the rest of the system.

### Zone anatomy
```html
<section class="zone" data-zone="anomalies">
  <div class="zone-header">
    <span class="zone-badge">Zone 01</span>
    <h2>Timeline Anomalies</h2>
    <p>Deploy and manage missions on the timeline.</p>
  </div>
  <!-- .admin-grid of .panel-card rows -->
</section>
```

### Zone color coding (`--zone-hue`)
Each zone tints its badge, heading mark, panel titles, and panel tags via a hue token. The three zones map onto the existing palette:
| Zone | `data-zone` | `--zone-hue` | Source color |
| :--- | :--- | :--- | :--- |
| Timeline Anomalies | `anomalies` | `18` | Flame Orange `#fe4e00` |
| Traveler Academy | `academy` | `220` | Dusk Blue `#345995` |
| Seminar Vault | `vault` | `205` | Sky Reflection `#83b5d1` |

Tinted text uses `hsl(var(--zone-hue, 18) 85% 60%)` for headings and `90% 62%` for badges/tags; borders use `70% 48%`. This keeps the hue on-palette while staying readable on dark surfaces.

### Zone CSS pattern
```css
.zone { margin-bottom: 46px; padding-bottom: 30px; border-bottom: 2px dashed rgba(131,181,209,0.25); }
.zone:last-of-type { border-bottom: none; margin-bottom: 0; }
.zone-badge { color: hsl(var(--zone-hue, 18) 90% 62%); border-color: hsl(var(--zone-hue, 18) 70% 48%); box-shadow: var(--shadow-hard-sm); }
.zone-header h2::before { content: "▶ "; color: hsl(var(--zone-hue, 18) 85% 60%); }
```

### Panel headers
Cards that need a label + action in the same row use `.panel-heading` (flex row, bottom keyline) with an optional `.panel-tag` chip on the right, tinted by the zone hue. Standard cards keep the plain `h2` underline header. All other form/table/security styles remain on the 5-color system.

---

## 11. Command Center Dashboard (CoreUI-inspired, reconciled)

`dashboardX.html` translates the CoreUI Dark SaaS admin layout onto the Time Portal system. **CoreUI is an inspiration, not a source of truth** - every token is re-mapped to the 5-color palette; there is no `#5856D6` / `#398BF7` / `#F9B115` / `#E55353` / `#323A49` anywhere.

### Layout architecture
```
+-----------+------------------------------------------------+
|  SIDEBAR  |  TOPBAR (breadcrumb · search · theme · user chip)|
|  250px    +------------------------------------------------+
|  grouped  |  page-head                                      |
|  nav      |  KPI ROW (4 color-block cards)                 |
|  status   |  PANEL (Portal Registry)                       |
|  footer   |  SUMMARY BAR (5-metric strip)                 |
|           |  LOWER GRID (2 lists)                          |
+-----------+------------------------------------------------+
```

* **App shell:** `display: grid; grid-template-columns: 250px 1fr; min-height: 100vh`. Sidebar is a bordered rail, not a floating glass panel.
* **Topbar:** sticky, `rgba(5,5,5,0.92)` + blur, bottom keyline. Contains breadcrumb (VT323, Flame Orange separators), search box with `Ctrl /` kbd hint, 40x40 theme toggle, and a bordered user chip with EP pill.
* **Content:** max-width 1280px, centered, 26px padding, 26px column gap.

### KPI row (4 cards)
Solid color-block cards (CoreUI concept) re-mapped to the palette:
* `kpi-purple` -> Dusk Blue `#345995`
* `kpi-blue` -> Sky Reflection `#83b5d1`
* `kpi-yellow` -> Tuscan Sun `#eec643`
* `kpi-red` -> Flame Orange `#fe4e00`

Each card: VT323 uppercase label + `⋯` options, Press Start 2P value, VT323 sub + delta (▲/▼), and a **segmented pixel bar** (ink segments) instead of CoreUI's smooth sparkline.

### Portal Registry panel
A no-chart inventory snapshot (COUNT / GROUP BY over existing tables). Three stat cells (Workshops / Roadmaps / Steps), then a two-column breakdown ("Workshops by category", "Steps per roadmap") rendered as segmented bars with per-row counts. Row fill reuses `--neon-cyan` (primary), `--neon-yellow` (secondary), `--neon-pink` (tertiary).

### Summary bar
Five-column stat strip (CoreUI summary) with `--si-hue` per column and a 10-segment fill bar per metric. Dividers use `--border-thin` between columns.

### Lower grid
Two `.panel` lists side by side (lists collapse to 1 column under 900px).

### Dark + light theme
`[data-theme="light"]` overrides surfaces to paper tones while **keeping the five palette colors as card fills and accent text**. Persisted in `localStorage`.

### Responsive rules
* `<=1100px`: KPI grid 2-col, summary bar 2-col, registry columns stack.
* `<=900px`: shell -> 1 column, sidebar becomes a horizontal wrap row (border-bottom), search hidden, lower grid 1-col.
* `<=600px`: KPI grid and summary bar -> 1 col, content/topbar padding tightens.

Everything else - bevels, hard shadows, type hierarchy, segmented HUD, no flashing - follows sections 1-7 unchanged.

---

## 12. Design Tokens Summary

* **Palette:** exactly five colors - Sky Reflection `#83b5d1`, Dusk Blue `#345995`, Flame Orange `#fe4e00`, Tuscan Sun `#eec643`, Onyx `#050505`. Never add new hexes for new features.
* **Shadows:** `--shadow-hard: 5px 5px 0 #000`, `--shadow-hard-sm: 3px 3px 0 #000`.
* **Borders:** `--border-thick: 3px solid #000`, `--border-thin: 2px solid #000`.
* **Fonts:** Press Start 2P (display), VT323 (meta), Space Grotesk (body).
* **Motion:** hovers 0.15s ease, shadow shifts, button press; `prefers-reduced-motion: reduce` -> static.
* **Zone hues:** only in the admin console, via `--zone-hue` derived from the 5 colors.
