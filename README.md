# Neon Drift Dodge

Neon Drift Dodge is a small arcade survival game built with plain HTML, CSS, and JavaScript. Version 6 is a final bugfix and polish release: it does not add new gameplay systems, but tightens stability, fairness, performance, layout, controls, and documentation so the game feels presentable.

## Version 6 polish focus

- Stabilized start, restart, pause, resume, mute, dash, shield, boost, level/rank, mission-style dodge streak, and power-up flows.
- Made hazard pressure fairer by slightly easing high-level spawn/speed scaling, limiting the widest hazards on compact arenas, and tightening collision radii.
- Fixed shield spawn checks so the game makes one timed attempt instead of rerolling every frame after the cooldown expires.
- Made pause safer by clearing held movement keys and freezing boost, dash, warning, wave, score, spawn, and invincibility timers until resume.
- Improved performance by caching HUD text updates, avoiding repeated heart queries, capping particles, and reducing broad `will-change` usage.
- Hardened best-score storage for browsers or privacy modes where `localStorage` can be blocked.
- Improved responsive spacing for short desktop screens, tablets, and phones, including smaller HUD tiles and tighter overlay padding.
- Added visible focus styles and reduced-motion support for a more polished UI.

## Gameplay

- Press **Start Run** and wait for the **3, 2, 1, oeeco** countdown.
- Drift left and right to dodge falling neon hazards.
- Press **Space** to dash in the last direction you moved.
- Watch the dash meter in the HUD; dash returns after its cooldown fills.
- Collect yellow and blue energy orbs for score and combo progress.
- Collect magenta speed boosts for temporary movement speed and a HUD countdown.
- Collect cyan shield cores to block one hit. A visible shield ring appears around the player while shielded.
- Chain clean dodges and power-up collections to raise the combo multiplier up to **x12**.
- Every **20 seconds**, the level increases and the arena becomes more dangerous.
- Hazard patterns include single blocks, horizontal lines, diagonal streams, sine-wave motion, and lane-gap waves with warning zones.
- You start with **3 hearts**. After a hit, the ship blinks briefly and is temporarily invincible.
- The game ends when all hearts are gone.
- Your best score is saved in `localStorage` when available and shown on the HUD and game over screen.

## Controls

| Action | Keys / Button |
| --- | --- |
| Move left | **ArrowLeft** or **A** |
| Move right | **ArrowRight** or **D** |
| Dash | **Space** |
| Pause / resume | **P** or **Resume** button |
| Mute / unmute | **Sound On / Muted** button |
| Restart after game over | **Restart Run** button |

## Run locally

No build step or dependencies are required. Open `index.html` directly in a browser, or serve the folder with a tiny local web server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

## Manual testing checklist

Use this checklist before publishing the final Version 6 build:

- The whole game fits common desktop/laptop sizes, including **1920x1080**, **1366x768**, and **1280x720**.
- Small screens can scroll vertically and important UI is not hidden by page overflow.
- Start and Restart both reset the run through the same countdown path.
- Pause/resume freezes and offsets run timers, cooldowns, warning lanes, speed boosts, pending waves, and invincibility timing.
- Held movement keys are cleared on pause, game over, restart, and window blur.
- Dash uses **Space**, moves in the current direction, plays a dash sound, creates particles, and updates the cooldown meter.
- Shield power-ups set shield state, show the shield ring, block one hit, and reset combo when consumed.
- Speed power-ups show a magenta player glow and a boost countdown in the HUD.
- Clean dodges and power-up collections increase the combo multiplier; hits and shield blocks reset the multiplier.
- Level/rank increases every **20 seconds**, shows clear level feedback, and increases obstacle pressure without becoming abruptly unfair.
- Mute toggles Web Audio sound effects and updates button state text.
- Best score loads from older Version 4/3 keys and saves to the Version 6 key when `localStorage` is available.

## Files

- `index.html` — game markup, compact HUD, mute button, boost indicator, `oeeco` background mark, title screen, countdown, pause screen, and game over screen.
- `style.css` — responsive layout, neon arcade visuals, HUD, overlays, warning lanes, shield/boost effects, level toast, particles, focus states, and reduced-motion support.
- `game.js` — game state, level system, movement, dash, shields, speed boosts, spawning, obstacle patterns, collision checks, audio, pause/resume, scoring multipliers, HUD caching, particle caps, and best-score saving.
