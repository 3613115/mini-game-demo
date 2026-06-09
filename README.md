# Neon Drift Dodge

Neon Drift Dodge is a beginner-friendly arcade survival game built with only plain HTML, CSS, and JavaScript. Version 3 focuses on a responsive one-page layout, a stronger arcade loop, level-based difficulty, dash movement, shields, warning waves, and Web Audio sound effects with no external assets or libraries.

## Gameplay

- Press **Start Run** on the title screen and wait for the **3, 2, 1, GO** countdown.
- Drift left and right to dodge falling red hazards.
- Press **Space** to dash quickly in the last direction you moved.
- Watch the dash meter in the HUD; dash returns after its cooldown fills.
- Collect yellow and blue energy orbs to score points and build combo.
- Collect cyan shield cores to block one hit. A visible shield ring appears around the player while shielded.
- Every **20 seconds**, the level increases and the arena becomes more dangerous.
- Warning lanes flash before dangerous obstacle waves so you can move toward a safe gap.
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

## Version 3 features

- Responsive layout using viewport-aware sizing so the title, game, pause, and game over screens fit on common desktop and laptop browser sizes.
- The page allows vertical scrolling on very small screens instead of hiding important UI.
- Compact HUD with score, best score, level, combo, health, shield status, and dash cooldown.
- Level system that advances every 20 seconds.
- Difficulty scaling through faster hazards, faster spawning, and more frequent wave pressure.
- Dangerous wave warnings before large patterns arrive.
- Obstacle patterns including falling lines, diagonal waves, and gap waves.
- Dash ability with cooldown meter.
- Shield power-up that blocks one hit and displays a shield effect.
- Countdown before play starts.
- Improved hit feedback with blinking invincibility, particles, and stronger screen shake.
- Web Audio API sound effects for collecting, shield pickups/blocks, hits, game over, and dash.
- Mute/unmute button.
- Game over screen with final score, best score, level reached, and restart button.

## Run locally

No build step or dependencies are required. Open `index.html` directly in a browser, or serve the folder with a tiny local web server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

## Manual testing checklist

Before finishing Version 3, the code was reviewed for these requirements:

- The whole game is designed to fit on a **1366x768** screen.
- Important UI is not hidden by `overflow: hidden` on the page; small screens can scroll vertically.
- Restart calls the same run reset path as Start Run.
- Pause/resume freezes and offsets run timers, cooldowns, warnings, and invincibility timing.
- Dash uses **Space**, moves in the current direction, and updates the HUD cooldown meter.
- Shield power-ups set shield state, show the shield ring, and block one hit.
- Mute button toggles all Web Audio sound effects.
- Best score is saved and loaded with `localStorage`.

## Files

- `index.html` — game markup, compact HUD, mute button, title screen, countdown, pause screen, and game over screen.
- `style.css` — responsive layout, neon arcade visuals, HUD, overlays, warning lanes, shield effect, and animations.
- `game.js` — game state, level system, dash, shields, spawning, obstacle patterns, collisions, audio, pause/resume, scoring, and best-score saving.
