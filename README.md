# solmar-bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/acch50827-maker/solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/acch50827-maker/solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Bay is an original 2D top-down open-world crime game set in a sunny coastal city. Walk the streets on foot or steal a car, dodge traffic and pedestrians, outrun police chases as your wanted level climbs from 0 to 5, and work through five chained missions across the city's districts — Downtown, Marina, Old Town, Harbour Park, Southside and the Works. It has a HUD with a minimap, combat on foot and from a car, a title screen, auto-save in the browser, and synthesized sound. Everything is drawn on canvas with plain JavaScript and no libraries; the game runs offline in a desktop browser, no network and no external assets, and nothing in it is copied from any existing game.

## What's inside

- `game/` — the whole game: `index.html` and the ES modules in `game/src/` (world, traffic, police, missions, rendering, audio, input).
- `serve.ts` — a tiny static server for local play, standard library only.
- `main.ts` — hands the game and screenshots to the make.fun grader as a dossier.
- `screenshots/` — the start screen, driving, a police chase, and a mission.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Node 22 or newer is required.

## How to play

- **Move:** WASD or arrow keys. While driving, W accelerates and S brakes/reverses, A/D steer.
- **Enter / exit a car:** E near a car.
- **Fight:** F to punch; the mouse aims and holding the left button shoots.
- **Pause:** P or Esc. **Mute:** M. **Load a save:** L.
- **Wanted level:** causing trouble raises it from 0 to 5; the higher it is, the harder the police chase you. Lay low to cool off.
- **Missions:** five chained missions, starting from the marker on the map. Your progress and best cash are saved in the browser automatically.

## Screenshots

See `screenshots/` — the start screen, driving, a police chase, and a mission.

---

<sub>Entered on [make.fun](https://make.fun/?ref=xzdd07z5&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
