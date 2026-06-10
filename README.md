# Neon Drift Dodge

Neon Drift Dodge is a beginner-friendly arcade survival game built with only plain HTML, CSS, and JavaScript. Version 4 keeps the Version 3 responsive layout, `oeeco` start text, health, dash, shield, pause, best-score, particle, and Web Audio systems while adding smoother movement, richer hazard patterns, speed boosts, dodge multipliers, and clearer compact HUD feedback.

## Gameplay

- Press **Start Run** on the title screen and wait for the **3, 2, 1, oeeco** countdown.
- Drift left and right to dodge falling neon hazards. Movement now uses acceleration and deceleration so the ship glides smoothly instead of snapping instantly.
- Press **Space** to dash quickly in the last direction you moved.
- Watch the dash meter in the HUD; dash returns after its cooldown fills.
- Collect yellow and blue energy orbs to score points and increase your combo multiplier.
- Collect magenta speed boosts for a temporary movement-speed boost and extra combo progress.
- Collect cyan shield cores to block one hit. A visible shield ring appears around the player while shielded.
- Chain clean dodges and power-up collections to raise the combo multiplier up to **x12**.
- Every **20 seconds**, the level increases and the arena becomes more dangerous with faster hazards, shorter spawn delays, and more frequent waves.
- Hazard patterns include single blocks, horizontal lines, diagonal streams, sine-wave motion, and lane-gap waves with warning zones.
- You start with **3 hearts**. After a hit, the ship blinks briefly and is temporarily invincible.
- The game ends when all hearts are gone.
- Your best score is saved in `localStorage` and shown on the HUD and game over screen.

## Controls

| Action | Keys / Button |
| --- | --- |
| Move left | **ArrowLeft** or **A** |
| Move right | **ArrowRight** or **D** |
| Dash | **Space** |
| Pause / resume | **P** or **Resume** button |
| Mute / unmute | **Sound On / Muted** button |
| Restart after game over | **Restart Run** button |

## Version 4 features

- Maintains all Version 3 mechanics: responsive layout fixes, compact screens, `oeeco` start text, health, dash cooldown, shield blocking, pause/resume, local best score, particles, and Web Audio effects.
- Smoother player movement with acceleration, controlled deceleration, and a temporary speed-boost state.
- Refined collision checks that combine a broad rectangle test with a tighter center-radius test for hazards, making near misses feel fair and reducing sticky edge hits.
- New magenta speed boost collectible with HUD countdown and player glow.
- Existing shield collectible now also contributes to scoring and multiplier chains.
- Scoring multiplier grows through consecutive power-up collections and clean dodges; hits or shield blocks reset the streak.
- More varied obstacle patterns: diagonal waves, horizontal lines, sine-wave hazards, and warning-backed gap waves.
- Level toast feedback appears every 20 seconds when difficulty increases.
- More compact HUD with score, best score, level, combo, health, shield, boost, and dash status.
- Subtle background `oeeco` watermark keeps the start text integrated into the arena without obstructing gameplay.
- Consistent neon styling for start, pause, and game over overlays.
- Web Audio API sound effects for collection, boost, shield, hit, dash, and game over, plus a mute/unmute button.

## Run locally

No build step or dependencies are required. Open `index.html` directly in a browser, or serve the folder with a tiny local web server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

## Manual testing checklist

Before finishing Version 4, review these behaviors:

- The whole game is designed to fit common desktop and laptop sizes, including **1920x1080**, **1366x768**, and **1280x720**.
- Important UI is not hidden by page overflow; small screens can scroll vertically.
- Restart calls the same run reset path as Start Run.
- Pause/resume freezes and offsets run timers, cooldowns, warning lanes, speed boosts, pending waves, and invincibility timing.
- Dash uses **Space**, moves in the current direction, plays a dash sound, creates particles, and updates the HUD cooldown meter.
- Shield power-ups set shield state, show the shield ring, block one hit, and reset combo when consumed.
- Speed power-ups show a magenta player glow and a boost countdown in the HUD.
- Clean dodges and power-up collections increase the combo multiplier; hits reset the multiplier.
- Level increases every **20 seconds**, shows clear level feedback, and increases obstacle pressure.
- Mute button toggles all Web Audio sound effects.
- Best score is saved and loaded with `localStorage`.

## Files

- `index.html` — game markup, compact HUD, mute button, boost indicator, subtle `oeeco` background mark, title screen, countdown, pause screen, and game over screen.
- `style.css` — responsive layout, neon arcade visuals, HUD, overlays, warning lanes, shield/boost effects, level toast, particles, and animations.
- `game.js` — game state, level system, smooth movement, dash, shields, speed boosts, spawning, obstacle patterns, refined collisions, audio, pause/resume, scoring multipliers, and best-score saving.
