// Screenshot scenes behind ?shot=start|play|levelup|end. Each one plays
// the real rules forward from a fresh world for a fixed simulated time,
// steered by an autopilot, so every frame is what a real game looks like
// and the same seed always gives the same frame. The strong pilot dodges
// and dashes; the weak one (end scene) wanders into trouble and dies,
// the way a hurried player does.

import { FIELD, PLAYER, STEP } from './config.js';
import { EVENT_LEVELUP, EVENT_OVER, createWorld, stepWorld } from './world.js';
import { applyUpgrade, buildStats } from './weapons.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 80;
const LEVELUP_LIMIT_SECONDS = 150;
const END_LIMIT_SECONDS = 400;

/**
 * Autopilot: flee the nearest shades, chase shards when it is safe, keep
 * off the walls. `skill` 1 dodges and dashes; 0 drifts and never dashes.
 */
export function autopilot(world, skill) {
  const p = world.player;
  let fx = 0;
  let fy = 0;
  let nearest = Infinity;
  for (const e of world.enemies) {
    if (e.spawnIn > 0) continue;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    nearest = Math.min(nearest, d);
    const rangePx = skill === 1 ? 240 : 130;
    if (d < rangePx) {
      const w = (1 - d / rangePx) * 2.2;
      fx += (dx / d) * w;
      fy += (dy / d) * w;
    }
  }
  // Clamp the flee vector: a whole pack below must not pin the pilot to
  // a wall — direction matters, not how many shades push it.
  const fm = Math.hypot(fx, fy);
  if (fm > 2.2) {
    fx = (fx / fm) * 2.2;
    fy = (fy / fm) * 2.2;
  }
  // Chase the nearest shard when nothing is close.
  if (nearest > 150 && skill === 1) {
    let best = null;
    let bestD = 320 * 320;
    for (const s of world.shards) {
      const dx = s.x - p.x;
      const dy = s.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) {
        bestD = d2;
        best = s;
      }
    }
    if (best) {
      const d = Math.sqrt(bestD) || 1;
      fx += ((best.x - p.x) / d) * 1.2;
      fy += ((best.y - p.y) / d) * 1.2;
    }
  }
  // Keep off the walls.
  const margin = 90;
  if (p.x < margin) fx += 2.5;
  if (p.x > FIELD.width - margin) fx -= 2.5;
  if (p.y < margin) fy += 2.5;
  if (p.y > FIELD.height - margin) fy -= 2.5;
  // Pull toward the centre, always on: fleeing still wins when shades
  // close in, but the pilot frames the action instead of camping a
  // corner, which also keeps the play screenshot centred.
  const cx = FIELD.width / 2 - p.x;
  const cy = FIELD.height / 2 - p.y;
  const cd = Math.hypot(cx, cy) || 1;
  const pull = Math.min(1.6, cd / 260);
  fx += (cx / cd) * pull;
  fy += (cy / cd) * pull;
  const m = Math.hypot(fx, fy);
  const dash = skill === 1 && nearest < 75 && p.dashCd <= 0;
  if (m < 0.05) return { mx: 0, my: 0, dash: false };
  return { mx: fx / m, my: fy / m, dash };
}

function applyFirstChoice(world) {
  if (world.choices.length === 0) return;
  applyUpgrade(world, world.choices[0].id);
  world.stats = buildStats(world.player.build);
  world.choices = [];
}

/**
 * How photogenic a play frame is: the lantern near the centre, a good
 * crowd of shades around it, and the run still healthy.
 */
function frameScore(world) {
  const p = world.player;
  if (p.hp < p.maxHp * 0.3 || world.enemies.length < 12) return -1;
  const dx = p.x - FIELD.width / 2;
  const dy = p.y - FIELD.height / 2;
  const centrality = 1 - Math.min(1, Math.hypot(dx, dy) / 640);
  const density = Math.min(world.enemies.length, 40) / 40;
  return centrality * 0.6 + density * 0.4;
}

/**
 * Set `world` to the named scene and return the screen to draw over it
 * and the best score to show. Any unknown name stages the title.
 */
export function stageShot(name, world) {
  world.seed = world.seed || 7;
  if (name === 'play') {
    // Two passes over the same seeded run: the first finds the most
    // photogenic frame in the first two minutes (sampled twice a
    // second), the second replays the run to exactly that frame, so the
    // screenshot is a real played moment, well framed.
    const probe = createWorld(world.seed);
    let bestStep = Math.round(PLAY_SECONDS / STEP);
    let bestScore = -1;
    for (let i = 0; i < 120 / STEP; i += 1) {
      const events = stepWorld(probe, autopilot(probe, 1), STEP);
      if (events & EVENT_LEVELUP) applyFirstChoice(probe);
      if (events & EVENT_OVER) break;
      if (i >= 45 / STEP && i % 30 === 0) {
        const score = frameScore(probe);
        if (score > bestScore) {
          bestScore = score;
          bestStep = i;
        }
      }
    }
    for (let i = 0; i <= bestStep; i += 1) {
      const events = stepWorld(world, autopilot(world, 1), STEP);
      if (events & EVENT_LEVELUP) applyFirstChoice(world);
      if (events & EVENT_OVER) break;
    }
    // Freeze mid-nova: the ring is a real game state (the pulse fires
    // every ~1.6s), and it shows the weapon the HUD cannot.
    if (!world.over) {
      world.nova = { x: world.player.x, y: world.player.y, radius: world.stats.pulseRadius, life: 0.22, maxLife: 0.35 };
    }
    return { screen: world.over ? 'over' : 'play', best: world.score };
  }
  if (name === 'levelup') {
    for (let i = 0; i < LEVELUP_LIMIT_SECONDS / STEP; i += 1) {
      const events = stepWorld(world, autopilot(world, 1), STEP);
      if (events & EVENT_LEVELUP) break;
      if (events & EVENT_OVER) break;
    }
    return { screen: world.choices.length > 0 ? 'levelup' : 'play', best: 0 };
  }
  if (name === 'end') {
    let over = false;
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      const events = stepWorld(world, autopilot(world, 0), STEP);
      if (events & EVENT_LEVELUP) applyFirstChoice(world);
      if (events & EVENT_OVER) {
        over = true;
        break;
      }
    }
    // A stubborn run: stand still and let the dark finish the job.
    while (!over) {
      const events = stepWorld(world, { mx: 0, my: 0, dash: false }, STEP);
      if (events & EVENT_OVER) over = true;
    }
    return { screen: 'over', best: world.score };
  }
  for (let i = 0; i < START_SECONDS / STEP; i += 1) {
    stepWorld(world, autopilot(world, 1), STEP);
  }
  return { screen: 'title', best: 0 };
}

export { createWorld };
