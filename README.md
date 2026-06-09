# Shadow Dodge

Shadow Dodge is a small browser arcade game built with plain HTML, CSS, and JavaScript. You control a glowing blue square at the bottom of the arena while red shadow blocks fall from above.

## Gameplay

- Press **Start Game** to begin.
- Move left with **ArrowLeft** and right with **ArrowRight**.
- Avoid all red falling blocks.
- Your score increases once per second.
- The falling speed and spawn pressure increase over time.
- If a red block touches the player, the game ends and your final score is shown.
- Press **Restart** to play again.

## Run locally

No build step or dependencies are required. Open `index.html` directly in a browser, or serve the folder with a tiny local web server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

## Files

- `index.html` — game markup and screens.
- `style.css` — dark arcade styling and polished UI.
- `game.js` — movement, spawning, scoring, speed scaling, and collision logic.
