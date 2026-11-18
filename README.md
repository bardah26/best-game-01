# best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/bardah26/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/bardah26/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Emberlight — A Firefly's Dawn Run.** You are Ember, the last firefly of the Hollow. Your glow is your life: it drains as you fly, faster in the gloom. Feed it with drifting embers, shatter the shadow wisps with a pulse of light (each pulse costs light), and reach the Dawn Gate 1200 metres away before you go dark.

Made for the [Make the best game](https://make.fun/bounty/best-game-01) bounty on [make.fun](https://make.fun).

## How to play

- **Move** — arrow keys / WASD, or hold the mouse and Ember glides toward it.
- **Pulse** — Space. A burst of light shatters nearby wisps, but costs 8 light. Brutes take two pulses.
- **Pause** — P. **Mute** — M. **Restart** — R. **Start** — Enter or click.
- **Embers** — +6 light and points. Chain pickups quickly for a combo (up to x5). A rare moth is worth +20 light and 50 points.
- **Wisps** — drifters slide by, hunters lean toward your light, brutes are big and slow. A touch drinks 18–26 light.
- **Win** — reach the Dawn Gate at 1200m. **Lose** — your light hits zero.

A run lasts about three minutes. Your best score is saved on your device.

## Run it

No build step, no dependencies — just static files.

```sh
# from this repo root
npx serve game
# or: python3 -m http.server --directory game 8000
```

Then open http://localhost:8000 (or the port shown) in a desktop browser. The game is a single canvas page; all sound is synthesized with WebAudio, all art is drawn in code — there are no asset downloads and no network requests at runtime.

## Files

- `main.ts` — entrypoint: copies `game/` and `screenshots/` to the output directory and writes `dossier.json`.
- `game/index.html` — the game page (1280×720 canvas).
- `game/css/style.css` — page chrome around the canvas.
- `game/js/main.js` — bootstrap, fixed-step loop, state machine (title / playing / paused / won / lost), input.
- `game/js/firefly.js` — Ember: movement, light as health, pulse, glow.
- `game/js/wisps.js` — shadow wisps (drifter, hunter, brute) and the difficulty ramp.
- `game/js/embers.js` — ember clusters, moths, spark particles.
- `game/js/cavern.js` — parallax cavern, crystals, gloom pockets, Dawn Gate.
- `game/js/hud.js` — light meter, score, combo, distance-to-gate bar, banners.
- `game/js/audio.js` — synthesized WebAudio sounds (no audio files).
- `game/js/screens.js` — title, pause, win and lose screens.
- `game/js/shots.js` — deterministic screenshot scenes (`?shot=title|play|win|lose&seed=N`).
- `game/js/rng.js` — seeded RNG and small helpers.
- `screenshots/` — the four entry screenshots, taken from the game itself.
