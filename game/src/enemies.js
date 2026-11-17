// Shades: the four regular enemy types plus the Warden boss. Each enemy
// is a plain object in world.enemies; this module spawns them at the
// arena edge and steers them each step. Spitters keep their distance and
// shoot orbs; the Warden fires radial bursts and calls in drifters.

import { ENEMIES, FIELD } from './config.js';
import { pick, range } from './random.js';

export const KIND_DRIFTER = 'drifter';
export const KIND_DART = 'dart';
export const KIND_BULWARK = 'bulwark';
export const KIND_SPITTER = 'spitter';
export const KIND_WARDEN = 'warden';

let nextId = 1;

/** Spawn one enemy of `type` at an arena edge, fading in for 0.6s. */
export function spawnEnemy(world, type, x, y) {
  const def = ENEMIES[type];
  const wave = world.waveDef;
  const hp = Math.round(def.hp * wave.hpMul * (type === KIND_WARDEN ? world.bossHpMul : 1));
  const enemy = {
    id: nextId,
    type,
    x,
    y,
    hp,
    maxHp: hp,
    speed: def.speed * wave.speedMul,
    damage: def.damage,
    radius: def.radius,
    xp: def.xp,
    score: def.score,
    spawnIn: 0.6,
    flash: 0,
    orbCd: 0,
    burstCd: 2.5,
    summonCd: 6,
    shootCd: range(world.rng, 1.2, 2.2),
    orbitAngle: world.rng() * Math.PI * 2,
    wobble: world.rng() * Math.PI * 2,
  };
  nextId += 1;
  world.enemies.push(enemy);
  return enemy;
}

/** A random point on the arena edge, at least 260px from the player. */
export function edgePoint(world) {
  const p = world.player;
  for (let tries = 0; tries < 12; tries += 1) {
    const side = Math.floor(world.rng() * 4);
    let x;
    let y;
    if (side === 0) {
      x = range(world.rng, 30, FIELD.width - 30);
      y = 30;
    } else if (side === 1) {
      x = range(world.rng, 30, FIELD.width - 30);
      y = FIELD.height - 30;
    } else if (side === 2) {
      x = 30;
      y = range(world.rng, 30, FIELD.height - 30);
    } else {
      x = FIELD.width - 30;
      y = range(world.rng, 30, FIELD.height - 30);
    }
    const dx = x - p.x;
    const dy = y - p.y;
    if (dx * dx + dy * dy > 260 * 260) return { x, y };
  }
  return { x: FIELD.width / 2, y: 30 };
}

/** Spawn `batch` enemies of the wave's types at the edges. */
export function spawnBatch(world) {
  const def = world.waveDef;
  for (let i = 0; i < def.batch && world.enemies.length < 90; i += 1) {
    const at = edgePoint(world);
    spawnEnemy(world, pick(world.rng, def.types), at.x, at.y);
  }
}

/** Spawn the wave's Warden boss at the top centre. */
export function spawnBoss(world) {
  const at = { x: FIELD.width / 2, y: 90 };
  const boss = spawnEnemy(world, KIND_WARDEN, at.x, at.y);
  world.boss = boss;
  return boss;
}

function steerToward(enemy, tx, ty, dt, speedMul = 1) {
  const dx = tx - enemy.x;
  const dy = ty - enemy.y;
  const d = Math.hypot(dx, dy) || 1;
  enemy.x += (dx / d) * enemy.speed * speedMul * dt;
  enemy.y += (dy / d) * enemy.speed * speedMul * dt;
}

/** One step of one enemy's movement and attacks. */
export function updateEnemy(world, enemy, dt) {
  const p = world.player;
  if (enemy.spawnIn > 0) {
    enemy.spawnIn -= dt;
    return;
  }
  enemy.flash = Math.max(0, enemy.flash - dt);
  enemy.wobble += dt * 2;
  const dx = p.x - enemy.x;
  const dy = p.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;

  if (enemy.type === KIND_DRIFTER) {
    // Slow chase with a sideways wobble, so the pack spreads out.
    const wob = Math.sin(enemy.wobble) * 0.45;
    const nx = dx / dist;
    const ny = dy / dist;
    enemy.x += (nx - ny * wob) * enemy.speed * dt;
    enemy.y += (ny + nx * wob) * enemy.speed * dt;
  } else if (enemy.type === KIND_DART) {
    // Fast straight chase, slightly faster when close: the pressure type.
    steerToward(enemy, p.x, p.y, dt, dist < 140 ? 1.25 : 1);
  } else if (enemy.type === KIND_BULWARK) {
    steerToward(enemy, p.x, p.y, dt);
  } else if (enemy.type === KIND_SPITTER) {
    // Holds a ring around the player and shoots orbs from range.
    if (dist > 300) steerToward(enemy, p.x, p.y, dt);
    else if (dist < 200) steerToward(enemy, p.x - dx * 2, p.y - dy * 2, dt);
    else {
      enemy.orbitAngle += dt * 0.8;
      enemy.x += Math.cos(enemy.orbitAngle) * 30 * dt;
      enemy.y += Math.sin(enemy.orbitAngle) * 30 * dt;
    }
    enemy.shootCd -= dt;
    if (enemy.shootCd <= 0 && dist < 460) {
      enemy.shootCd = range(world.rng, 1.8, 2.6);
      world.enemyShots.push({
        x: enemy.x,
        y: enemy.y,
        vx: (dx / dist) * 210,
        vy: (dy / dist) * 210,
        radius: 7,
        damage: enemy.damage,
        life: 4,
      });
    }
  } else if (enemy.type === KIND_WARDEN) {
    steerToward(enemy, p.x, p.y, dt, 0.9);
    enemy.burstCd -= dt;
    if (enemy.burstCd <= 0) {
      enemy.burstCd = 4;
      const n = 10;
      const off = world.rng() * Math.PI * 2;
      for (let i = 0; i < n; i += 1) {
        const a = off + (i / n) * Math.PI * 2;
        world.enemyShots.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(a) * 170,
          vy: Math.sin(a) * 170,
          radius: 8,
          damage: 10,
          life: 5,
        });
      }
      world.shake = Math.max(world.shake, 6);
    }
    enemy.summonCd -= dt;
    if (enemy.summonCd <= 0 && world.enemies.length < 60) {
      enemy.summonCd = 8;
      for (let i = 0; i < 3; i += 1) {
        const a = world.rng() * Math.PI * 2;
        spawnEnemy(world, KIND_DRIFTER, enemy.x + Math.cos(a) * 70, enemy.y + Math.sin(a) * 70);
      }
    }
  }

  // Keep enemies inside the arena.
  enemy.x = Math.max(enemy.radius, Math.min(FIELD.width - enemy.radius, enemy.x));
  enemy.y = Math.max(enemy.radius, Math.min(FIELD.height - enemy.radius, enemy.y));
}

/** Soft separation so the pack does not stack into one blob. */
export function separate(world) {
  const list = world.enemies;
  for (let i = 0; i < list.length; i += 1) {
    const a = list[i];
    for (let j = i + 1; j < list.length; j += 1) {
      const b = list[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = a.radius + b.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0.01 && d2 < min * min) {
        const d = Math.sqrt(d2);
        const push = ((min - d) / d) * 0.5;
        a.x -= dx * push * 0.5;
        a.y -= dy * push * 0.5;
        b.x += dx * push * 0.5;
        b.y += dy * push * 0.5;
      }
    }
  }
}
