# Neon Drift Dodge

Neon Drift Dodge is a polished second version of the original mini-game demo. It is still built with only plain HTML, CSS, and JavaScript, but now plays more like a small arcade game with screens, health, collectibles, combo scoring, difficulty scaling, effects, and saved best scores.

## Gameplay

- Press **Start Run** on the title screen to begin.
- Drift left and right to dodge falling red hazards.
- Collect glowing blue and yellow energy orbs to increase your score.
- Keep collecting orbs without getting hit to build a combo multiplier.
- You start with **3 hearts**. A red hazard removes one heart instead of ending the game instantly.
- The game ends when all hearts are gone.
- Your best score is saved in `localStorage` and shown on the HUD and game over screen.

## Controls

| Action | Keys |
| --- | --- |
| Move left | **ArrowLeft** or **A** |
| Move right | **ArrowRight** or **D** |
| Pause / resume | **P** |
| Restart after game over | Click **Restart Run** |

## Version 2 features

- Title screen with instructions and a start button.
- Smooth movement with acceleration, friction, and responsive edge clamping.
- Three red hazard types:
  - normal red blocks,
  - fast thin blocks,
  - large slow blocks.
- Blue and yellow collectible energy orbs with different point values.
- 3-heart health system with temporary invulnerability after a hit.
- Hit feedback with player flashing, red particles, and screen shake.
- Particle bursts when collecting orbs.
- Difficulty scaling that increases threat level, hazard speed, and spawn pressure over time.
- Combo scoring for orb streaks without getting hit.
- Pause and resume with the **P** key.
- Improved game over screen with final score, best score, and new-best messaging.
- Dark neon arcade visuals, animated starfield/grid background, polished HUD, and improved buttons.

## Run locally

No build step or dependencies are required. Open `index.html` directly in a browser, or serve the folder with a tiny local web server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

## Files

- `index.html` — game markup, HUD, title screen, pause screen, and game over screen.
- `style.css` — neon arcade visuals, animated background, HUD, buttons, and effects.
- `game.js` — game state, smooth movement, spawning, scoring, health, collisions, particles, pause/resume, and best-score saving.
