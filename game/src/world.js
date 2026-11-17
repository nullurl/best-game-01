// The world: everything that changes while the game runs. createWorld
// builds a fresh run from a seed; step advances it one fixed timestep
// from a movement command {mx, my, dash}; the screens in main.js own the
// state machine and call step only while playing. Events are bit flags
// the caller reads each step: level-up, wave change, boss, win, game over.

import { FIELD, MAX_ENEMIES, PLAYER, WAVES, WAVE_SECONDS, WIN_WAVE } from './config.js';
import { makeRng, range } from './random.js';
import { buildStats, createBuild, rollChoices, updateWeapons } from './weapons.js';
import { separate, spawnBatch, spawnBoss, updateEnemy } from './enemies.js';

export const EVENT_NONE = 0;
export const EVENT_LEVELUP = 1;
export const EVENT_OVER = 2;
export const EVENT_WIN = 4;
export const EVENT_WAVE = 8;
export const EVENT_BOSS = 16;

export function xpForLevel(level) {
  return PLAYER.xpBase + level * PLAYER.xpPerLevel;
}

export function createWorld(seed = 1) {
  const world = {
    seed,
    rng: makeRng(seed),
    time: 0,
    wave: 1,
    waveTime: 0,
    waveDef: WAVES[0],
    spawnTimer: 1,
    bossSpawned: false,
    bossKilled: false,
    boss: null,
    score: 0,
    kills: 0,
    shardsGot: 0,
    levelUps: 0,
    over: false,
    won: false,
    banner: '',
    bannerTime: 0,
    shake: 0,
    nova: null,
    player: null,
    stats: null,
    enemies: [],
    shots: [],
    enemyShots: [],
    shards: [],
    pickups: [],
    particles: [],
    floaters: [],
    choices: [],
    // Sound hook: main.js sets it to the synth; staging leaves it silent.
    onSound: () => {},
    damageEnemy,
    hurtPlayer,
  };
  resetWorld(world);
  return world;
}

export function resetWorld(world) {
  world.rng = makeRng(world.seed);
  world.time = 0;
  world.wave = 1;
  world.waveTime = 0;
  world.waveDef = WAVES[0];
  world.spawnTimer = 1.2;
  world.bossSpawned = false;
  world.bossKilled = false;
  world.boss = null;
  world.score = 0;
  world.kills = 0;
  world.shardsGot = 0;
  world.levelUps = 0;
  world.over = false;
  world.won = false;
  world.banner = 'Wave 1 — the dark stirs';
  world.bannerTime = 2.2;
  world.shake = 0;
  world.nova = null;
  world.enemies = [];
  world.shots = [];
  world.enemyShots = [];
  world.shards = [];
  world.pickups = [];
  world.particles = [];
  world.floaters = [];
  world.choices = [];
  const build = createBuild();
  world.player = {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    level: 1,
    xp: 0,
    xpNext: xpForLevel(1),
    build,
    pulseCd: 0.5,
    beamCd: 0.3,
    orbitAngle: 0,
    dashCd: 0,
    dashTime: 0,
    dashX: 0,
    dashY: -1,
    invuln: 0,
    faceX: 0,
    faceY: -1,
    moving: false,
  };
  world.stats = buildStats(build);
}

function burst(world, x, y, color, n, speed) {
  for (let i = 0; i < n && world.particles.length < 400; i += 1) {
    const a = world.rng() * Math.PI * 2;
    const v = range(world.rng, speed * 0.3, speed);
    world.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: range(world.rng, 0.3, 0.7),
      maxLife: 0.7,
      color,
      size: range(world.rng, 2, 4.5),
    });
  }
}

function floater(world, x, y, text, color) {
  if (world.floaters.length > 60) world.floaters.shift();
  world.floaters.push({ x, y, text, color, life: 0.8, maxLife: 0.8 });
}

function dropShards(world, x, y, total) {
  let left = total;
  while (left > 0) {
    const value = Math.min(3, left);
    left -= value;
    const a = world.rng() * Math.PI * 2;
    const v = range(world.rng, 40, 130);
    world.shards.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      value,
      life: 25,
    });
  }
}

/** Damage one enemy; kills drop shards and may end the run in victory. */
function damageEnemy(enemy, amount, now) {
  const world = this;
  if (enemy.hp <= 0) return;
  enemy.hp -= amount;
  enemy.flash = 0.12;
  floater(world, enemy.x, enemy.y - enemy.radius - 6, String(Math.round(amount)), '#fde68a');
  if (enemy.hp > 0) {
    if (world.rng() < 0.3) world.onSound('hit');
    return;
  }
  world.kills += 1;
  world.score += enemy.score;
  burst(world, enemy.x, enemy.y, '#a78bfa', enemy.type === 'warden' ? 40 : 12, 220);
  dropShards(world, enemy.x, enemy.y, enemy.xp);
  if (world.rng() < 0.03) {
    world.pickups.push({ x: enemy.x, y: enemy.y, kind: 'heart', life: 12 });
  }
  world.onSound('kill');
  if (enemy.type === 'warden') {
    world.boss = null;
    world.bossKilled = true;
    world.score += 1000;
    world.shake = Math.max(world.shake, 10);
    if (world.wave >= WIN_WAVE) {
      world.won = true;
    }
  }
}

/** Damage the player, respecting invulnerability and armor. */
function hurtPlayer(amount) {
  const world = this;
  const p = world.player;
  if (p.invuln > 0 || p.dashTime > 0 || world.over) return;
  const taken = Math.max(1, Math.round(amount * world.stats.damageTakenMul));
  p.hp -= taken;
  p.invuln = PLAYER.contactInvuln;
  world.shake = Math.max(world.shake, 7);
  floater(world, p.x, p.y - 30, `-${taken}`, '#f87171');
  burst(world, p.x, p.y, '#f87171', 10, 180);
  world.onSound('hurt');
  if (p.hp <= 0) {
    p.hp = 0;
    world.over = true;
    burst(world, p.x, p.y, '#fde68a', 50, 300);
  }
}

/** Advance the world one fixed step. Returns event flags. */
export function stepWorld(world, cmd, dt) {
  if (world.over || world.won) return EVENT_NONE;
  const p = world.player;
  let events = EVENT_NONE;
  world.time += dt;
  world.bannerTime = Math.max(0, world.bannerTime - dt);
  world.shake = Math.max(0, world.shake - dt * 22);
  if (world.nova) {
    world.nova.life -= dt;
    if (world.nova.life <= 0) world.nova = null;
  }

  // --- Player movement and dash ---
  const st = world.stats;
  p.invuln = Math.max(0, p.invuln - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  if (p.hp < p.maxHp && st.regen > 0) p.hp = Math.min(p.maxHp, p.hp + st.regen * dt);
  if (cmd.dash && p.dashCd <= 0 && p.dashTime <= 0) {
    p.dashTime = PLAYER.dashTime;
    p.dashCd = PLAYER.dashCooldown * st.dashCdMul;
    const m = Math.hypot(cmd.mx, cmd.my);
    if (m > 0.1) {
      p.dashX = cmd.mx / m;
      p.dashY = cmd.my / m;
    } else {
      p.dashX = p.faceX;
      p.dashY = p.faceY;
    }
    world.onSound('dash');
  }
  if (p.dashTime > 0) {
    p.dashTime -= dt;
    p.x += p.dashX * PLAYER.dashSpeed * dt;
    p.y += p.dashY * PLAYER.dashSpeed * dt;
  } else {
    const speed = PLAYER.speed * st.moveMul;
    p.x += cmd.mx * speed * dt;
    p.y += cmd.my * speed * dt;
    p.moving = cmd.mx !== 0 || cmd.my !== 0;
    if (p.moving) {
      p.faceX = cmd.mx;
      p.faceY = cmd.my;
    }
  }
  p.x = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, p.x));
  p.y = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, p.y));

  // --- Waves and spawning ---
  world.waveTime += dt;
  if (world.waveTime >= WAVE_SECONDS && world.wave < WIN_WAVE) {
    world.wave += 1;
    world.waveTime = 0;
    world.waveDef = WAVES[world.wave - 1];
    world.score += 250;
    if (world.waveDef.boss && !world.bossSpawned) {
      world.bossSpawned = true;
      spawnBoss(world);
      world.banner = `Wave ${world.wave} — the WARDEN wakes`;
      world.bannerTime = 3;
      world.onSound('boss');
      events |= EVENT_BOSS;
    } else {
      world.banner = `Wave ${world.wave}`;
      world.bannerTime = 2;
    }
    events |= EVENT_WAVE;
  }
  world.spawnTimer -= dt;
  if (world.spawnTimer <= 0 && world.enemies.length < MAX_ENEMIES) {
    world.spawnTimer = world.waveDef.interval;
    spawnBatch(world);
  }

  // --- Weapons, enemies, projectiles ---
  updateWeapons(world, dt);
  for (const e of world.enemies) updateEnemy(world, e, dt);
  separate(world);

  for (let i = world.shots.length - 1; i >= 0; i -= 1) {
    const s = world.shots[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    let dead = s.life <= 0 || s.x < 0 || s.x > FIELD.width || s.y < 0 || s.y > FIELD.height;
    if (!dead) {
      for (const e of world.enemies) {
        if (e.spawnIn > 0 || e.hp <= 0) continue;
        const dx = e.x - s.x;
        const dy = e.y - s.y;
        if (dx * dx + dy * dy < (e.radius + s.radius) * (e.radius + s.radius)) {
          world.damageEnemy(e, s.damage, world.time);
          dead = true;
          break;
        }
      }
    }
    if (dead) world.shots.splice(i, 1);
  }

  for (let i = world.enemyShots.length - 1; i >= 0; i -= 1) {
    const s = world.enemyShots[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    let dead = s.life <= 0 || s.x < -20 || s.x > FIELD.width + 20 || s.y < -20 || s.y > FIELD.height + 20;
    if (!dead) {
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      if (dx * dx + dy * dy < (PLAYER.radius + s.radius) * (PLAYER.radius + s.radius)) {
        world.hurtPlayer(s.damage);
        dead = true;
      }
    }
    if (dead) world.enemyShots.splice(i, 1);
  }

  // --- Contact damage, shards, pickups ---
  for (const e of world.enemies) {
    if (e.spawnIn > 0 || e.hp <= 0) continue;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    if (dx * dx + dy * dy < (PLAYER.radius + e.radius) * (PLAYER.radius + e.radius)) {
      world.hurtPlayer(e.damage);
    }
  }
  world.enemies = world.enemies.filter((e) => e.hp > 0);

  const magnetR = PLAYER.magnetRadius * st.magnetMul;
  for (let i = world.shards.length - 1; i >= 0; i -= 1) {
    const s = world.shards[i];
    s.life -= dt;
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < magnetR) {
      const pull = 900 * (1 - d / (magnetR + 1)) + 260;
      s.vx += (dx / d) * pull * dt * 4;
      s.vy += (dy / d) * pull * dt * 4;
    }
    s.vx *= 0.92;
    s.vy *= 0.92;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (d < PLAYER.radius + 12 || s.life <= 0) {
      if (d < PLAYER.radius + 12) {
        p.xp += s.value + st.xpBonus;
        world.shardsGot += 1;
        world.score += 5;
        world.onSound('pickup');
      }
      world.shards.splice(i, 1);
    }
  }
  for (let i = world.pickups.length - 1; i >= 0; i -= 1) {
    const u = world.pickups[i];
    u.life -= dt;
    const dx = p.x - u.x;
    const dy = p.y - u.y;
    if (Math.hypot(dx, dy) < PLAYER.radius + 14) {
      p.hp = Math.min(p.maxHp, p.hp + 15);
      floater(world, p.x, p.y - 30, '+15', '#4ade80');
      world.pickups.splice(i, 1);
    } else if (u.life <= 0) {
      world.pickups.splice(i, 1);
    }
  }

  // --- Particles and floaters ---
  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const pt = world.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.94;
    pt.vy *= 0.94;
    if (pt.life <= 0) world.particles.splice(i, 1);
  }
  for (let i = world.floaters.length - 1; i >= 0; i -= 1) {
    const f = world.floaters[i];
    f.life -= dt;
    f.y -= 34 * dt;
    if (f.life <= 0) world.floaters.splice(i, 1);
  }

  // --- Level-ups, win, loss ---
  if (p.xp >= p.xpNext) {
    p.level += 1;
    p.xp -= p.xpNext;
    p.xpNext = xpForLevel(p.level);
    world.levelUps += 1;
    world.choices = rollChoices(world);
    burst(world, p.x, p.y, '#67e8f9', 24, 260);
    world.onSound('levelup');
    events |= EVENT_LEVELUP;
  }
  if (world.won) events |= EVENT_WIN;
  if (world.over) events |= EVENT_OVER;
  return events;
}

/** Best score persistence (guarded: storage may be unavailable). */
export function loadBest() {
  try {
    return Number(window.localStorage.getItem('voidlight-best') || 0);
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  try {
    const best = loadBest();
    if (score > best) window.localStorage.setItem('voidlight-best', String(score));
    return Math.max(best, score);
  } catch {
    return score;
  }
}
