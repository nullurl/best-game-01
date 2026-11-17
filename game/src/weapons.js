// Weapons and upgrades. The player starts with the nova pulse; the
// orbiting sparks and the auto-aimed starlance are unlocked by level-up
// choices, and every weapon grows with further ranks. Firing is automatic:
// the player's skill is positioning, dashing and choosing upgrades.

import { UPGRADES, WEAPONS } from './config.js';
import { sample } from './random.js';

/** Fresh weapon state: pulse owned at rank 1, the others locked. */
export function createBuild() {
  return {
    pulse: 1,
    orbit: 0,
    beam: 0,
    swift: 0,
    vitality: 0,
    magnet: 0,
    armor: 0,
    regen: 0,
    dash: 0,
    greed: 0,
  };
}

/** The upgrades still available (not at max rank), as defs. */
export function availableUpgrades(build) {
  return UPGRADES.filter((u) => (build[u.id] || 0) < u.max);
}

/** Roll 3 distinct upgrade choices for a level-up (fewer if nearly maxed). */
export function rollChoices(world) {
  const pool = availableUpgrades(world.player.build);
  if (pool.length === 0) return [];
  return sample(world.rng, pool, Math.min(3, pool.length));
}

/** Apply one upgrade rank to the player. */
export function applyUpgrade(world, id) {
  const p = world.player;
  p.build[id] = (p.build[id] || 0) + 1;
  if (id === 'vitality') {
    p.maxHp += 25;
    p.hp = Math.min(p.maxHp, p.hp + 25);
  }
}

/** Derived stats from the build, recomputed each step (cheap, always right). */
export function buildStats(build) {
  return {
    moveMul: 1 + 0.12 * build.swift,
    magnetMul: 1 + 0.7 * build.magnet,
    damageTakenMul: Math.pow(0.85, build.armor),
    regen: 0.8 * build.regen,
    dashCdMul: Math.pow(0.75, build.dash),
    xpBonus: build.greed,
    pulseDamage: WEAPONS.pulse.baseDamage * (1 + 0.3 * (build.pulse - 1)),
    pulseRadius: WEAPONS.pulse.baseRadius * (1 + 0.12 * (build.pulse - 1)),
    pulseCd: WEAPONS.pulse.baseCooldown * Math.pow(0.92, build.pulse - 1),
    orbitCount: build.orbit > 0 ? WEAPONS.orbit.baseCount + (build.orbit - 1) : 0,
    orbitDamage: WEAPONS.orbit.baseDamage * (1 + 0.2 * Math.max(0, build.orbit - 1)),
    beamCount: build.beam,
    beamDamage: WEAPONS.beam.baseDamage * (1 + 0.15 * Math.max(0, build.beam - 1)),
    beamCd: WEAPONS.beam.baseCooldown * Math.pow(0.9, Math.max(0, build.beam - 1)),
  };
}

function nearestEnemy(world, x, y, rangePx) {
  let best = null;
  let bestD = rangePx * rangePx;
  for (const e of world.enemies) {
    if (e.spawnIn > 0) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD) {
      bestD = d2;
      best = e;
    }
  }
  return best;
}

/** Fire every owned weapon whose cooldown is up. Called from world.step. */
export function updateWeapons(world, dt) {
  const p = world.player;
  const st = world.stats;
  const now = world.time;

  // Nova pulse: a ring that damages and knocks back everything nearby.
  if (p.build.pulse > 0) {
    p.pulseCd -= dt;
    if (p.pulseCd <= 0) {
      p.pulseCd = st.pulseCd;
      world.nova = { x: p.x, y: p.y, radius: st.pulseRadius, life: 0.35, maxLife: 0.35 };
      for (const e of world.enemies) {
        if (e.spawnIn > 0) continue;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < st.pulseRadius + e.radius) {
          world.damageEnemy(e, st.pulseDamage, now);
          const k = WEAPONS.pulse.knockback / Math.max(40, d);
          e.x += dx * k * 0.12;
          e.y += dy * k * 0.12;
        }
      }
      world.onSound('nova');
    }
  }

  // Starlance: bolts at the nearest shades in range.
  if (p.build.beam > 0) {
    p.beamCd -= dt;
    if (p.beamCd <= 0) {
      p.beamCd = st.beamCd;
      const targets = [];
      for (let i = 0; i < st.beamCount; i += 1) {
        const t = nearestEnemy(world, p.x, p.y, WEAPONS.beam.range);
        if (!t || targets.includes(t)) break;
        targets.push(t);
      }
      for (const t of targets) {
        const dx = t.x - p.x;
        const dy = t.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        world.shots.push({
          x: p.x,
          y: p.y,
          vx: (dx / d) * WEAPONS.beam.speed,
          vy: (dy / d) * WEAPONS.beam.speed,
          radius: 6,
          damage: st.beamDamage,
          life: 1.2,
        });
      }
      if (targets.length > 0) world.onSound('shoot');
    }
  }

  // Orbiters: sparks circling the lantern, damaging on contact.
  p.orbitAngle += WEAPONS.orbit.orbitSpeed * dt;
  if (st.orbitCount > 0) {
    for (let i = 0; i < st.orbitCount; i += 1) {
      const a = p.orbitAngle + (i / st.orbitCount) * Math.PI * 2;
      const ox = p.x + Math.cos(a) * WEAPONS.orbit.orbitRadius;
      const oy = p.y + Math.sin(a) * WEAPONS.orbit.orbitRadius;
      for (const e of world.enemies) {
        if (e.spawnIn > 0 || (e.orbHitAt && now - e.orbHitAt < WEAPONS.orbit.hitCooldown)) continue;
        const dx = e.x - ox;
        const dy = e.y - oy;
        if (dx * dx + dy * dy < (e.radius + 12) * (e.radius + 12)) {
          e.orbHitAt = now;
          world.damageEnemy(e, st.orbitDamage, now);
        }
      }
    }
  }
}
