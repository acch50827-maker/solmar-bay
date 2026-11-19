# Porto Verde

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/acch50827-maker/solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/acch50827-maker/solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Porto Verde is an original 2D top-down open-world crime game that runs offline in
a desktop browser from static files. You are Dante Cruz, a driver fresh out of
prison, working off a debt to fixer Lena Ortiz across five chained jobs — while
the Bay Police and the Salazar crew close in.

## The story

Dante did three years for a job that went wrong. On the day he walks out, Lena
Ortiz is waiting with a list: a package for the Grand Hotel Azul, a pickup that
turns into a chase, a timed run across three checkpoints, a friend pinned down
at the docks, and one last vault at Porto Bank. Finish all five and the debt is
paid — and Porto Verde is his.

## Tips

- **Steal smart.** Every stolen car adds a star. Grab a parked car on a quiet
  street, not one in front of a patrol car.
- **Use the minimap.** The yellow marker is your objective; blue dots are
  police. If the dots close in, cut through the park or the beach.
- **Lay low to cool off.** Hide where no police car can see you for a few
  seconds and the stars start to drop.
- **Bank the cash.** Pick up the green `$` drops from thugs and wrecked police
  cars — and finish missions, because the rewards are where the money is.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network
requests, no libraries: plain HTML, CSS and JavaScript under `game/`.

## Controls

- **WASD / arrows** — walk, or drive when you are in a car
- **Mouse** — aim on foot; **Click** — shoot
- **E** — steal / enter a car, or get out of one
- **Shift** — run on foot
- **Space** — handbrake while driving
- **P** — pause, **M** — mute, **Q** — back to the title screen

## What is in the game

- **A living coastal city** — Porto Verde, 3200×2400: downtown towers, homes,
  a central park, a beach and a marina, with traffic and pedestrians.
- **Cars to steal and drive** — traffic follows the road grid; parked cars wait
  on the curb. Stealing one raises your wanted level.
- **Wanted 0–5 stars** — crimes draw the Bay Police. They chase, ram, and shoot
  from 3 stars up. Lay low and the heat cools off; get caught and you lose 20%
  of your cash.
- **Five chained missions** — Paket Pertama, Jemput Lena, Tiga Pos, Selamatkan
  Tomas and Brankas Pelabuhan, $3,300 in total rewards, ending in a harbor
  heist and a boat escape.
- **Combat and pickups** — shoot on foot, fight off Salazar's thugs, grab cash
  and health.
- **HUD with a minimap** — cash, health, wanted stars, speed, the mission list
  and a live minimap with the objective marker and police blips.
- **Start and save** — title screen, pause, and autosave to localStorage.

## Files

- `game/index.html` — the page and canvas
- `game/src/main.js` — game loop, modes, save/load
- `game/src/city.js` — the city: roads, buildings, park, beach, marina
- `game/src/vehicles.js` — driving physics and traffic
- `game/src/people.js` — pedestrians
- `game/src/police.js` — wanted level and police chases
- `game/src/combat.js` — bullets, thugs, pickups
- `game/src/missions.js` — the five chained jobs
- `game/src/render.js` — drawing, HUD, minimap, menus
- `game/src/audio.js` — synthesized WebAudio sound, no audio files
- `game/src/input.js` — keyboard and mouse
- `game/src/shots.js` — the `?shot=` screenshot scenes
- `game/src/util.js` — math and random helpers
- `screenshots/` — four real renders of the game

---

<sub>Entered on [make.fun](https://make.fun/?ref=xzdd07z5&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
