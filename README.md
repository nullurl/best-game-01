# best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/nullurl/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/nullurl/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

VOIDLIGHT — Last lantern of the Drift. A top-down arena survival game: you are the last lantern-keeper, holding a circle of light against waves of shades. Weapons fire on their own; your skill is positioning, dashing, and choosing upgrades. Survive 10 waves, banish the Wardens, and bring back the dawn.

- 4 enemy types + a boss Warden (radial bursts, summons minions)
- 3 weapons (nova pulse, orbiting sparks, auto-aimed starlance) and 10 upgrades, chosen at level-up
- Dash with invulnerability frames, magnet shard pickups, heart drops
- Procedural WebAudio sound (no audio files), pause, mute, best-score persistence
- Static files only: no build step, no network requests

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

WASD / arrows move, SPACE dashes, P pauses, M mutes. Level up to pick 1 of 3 upgrades. Clear wave 10's Warden to win.

## Layout

- `game/index.html` — the page (canvas + module script)
- `game/src/config.js` — all tuning: field, player, weapons, enemies, waves, upgrades
- `game/src/random.js` — seeded RNG (deterministic runs and screenshots)
- `game/src/input.js` — keyboard and mouse state
- `game/src/audio.js` — procedural WebAudio sound effects
- `game/src/enemies.js` — shade types, spawning, boss behaviour
- `game/src/weapons.js` — weapons, firing, upgrade pool
- `game/src/world.js` — game state, fixed-step simulation, waves, win/loss
- `game/src/render.js` — canvas art, HUD, title / level-up / pause / end screens
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=start|play|levelup|end`)
- `game/src/main.js` — boot, game loop, screen state machine

---

<sub>Entered on [make.fun](https://make.fun/?ref=9xrvxpg6&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
