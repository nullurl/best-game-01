// VOIDLIGHT tuning: every number the game balances on lives here, so a
// balance pass touches one file. Times are seconds, distances pixels,
// speeds pixels per second. The field is the whole canvas: a fixed arena
// with walls, no camera, so every screenshot reads at a glance.

export const FIELD = { width: 1280, height: 800 };
export const STEP = 1 / 60;
export const WIN_WAVE = 10;

export const PLAYER = {
  radius: 16,
  speed: 235,
  maxHp: 100,
  dashSpeed: 620,
  dashTime: 0.22,
  dashCooldown: 2.4,
  dashInvuln: 0.3,
  contactInvuln: 0.6,
  magnetRadius: 90,
  xpBase: 5,
  xpPerLevel: 4,
};

export const WEAPONS = {
  // Radial nova around the lantern, the starting weapon.
  pulse: { baseDamage: 14, baseRadius: 130, baseCooldown: 1.6, knockback: 190 },
  // Sparks orbiting the lantern, unlocked by upgrade.
  orbit: { baseDamage: 9, baseCount: 2, orbitRadius: 74, orbitSpeed: 3.1, hitCooldown: 0.45 },
  // Auto-aimed bolts at the nearest shade, unlocked by upgrade.
  beam: { baseDamage: 11, baseCount: 1, baseCooldown: 0.85, range: 520, speed: 640 },
};

export const ENEMIES = {
  drifter: { hp: 12, speed: 58, damage: 8, radius: 14, xp: 1, score: 10, color: '#a78bfa' },
  dart: { hp: 7, speed: 118, damage: 6, radius: 11, xp: 1, score: 15, color: '#f472b6' },
  bulwark: { hp: 46, speed: 34, damage: 14, radius: 23, xp: 3, score: 30, color: '#fb923c' },
  spitter: { hp: 16, speed: 48, damage: 6, radius: 13, xp: 2, score: 25, color: '#4ade80' },
  warden: { hp: 620, speed: 42, damage: 20, radius: 42, xp: 25, score: 500, color: '#f87171' },
};

// Wave table: which shades may spawn, how fast, and how many at once.
// Boss waves (5 and 10) spawn the Warden instead of the normal trickle.
export const WAVES = [
  { types: ['drifter'], interval: 1.5, batch: 1, hpMul: 1.0, speedMul: 1.0 },
  { types: ['drifter', 'dart'], interval: 1.3, batch: 1, hpMul: 1.05, speedMul: 1.02 },
  { types: ['drifter', 'dart', 'spitter'], interval: 1.15, batch: 2, hpMul: 1.1, speedMul: 1.04 },
  { types: ['drifter', 'dart', 'spitter', 'bulwark'], interval: 1.0, batch: 2, hpMul: 1.18, speedMul: 1.06 },
  { types: ['drifter', 'dart'], interval: 1.4, batch: 1, hpMul: 1.25, speedMul: 1.08, boss: true },
  { types: ['dart', 'spitter', 'bulwark'], interval: 0.9, batch: 2, hpMul: 1.35, speedMul: 1.1 },
  { types: ['drifter', 'dart', 'spitter', 'bulwark'], interval: 0.85, batch: 3, hpMul: 1.45, speedMul: 1.12 },
  { types: ['dart', 'bulwark', 'spitter'], interval: 0.8, batch: 3, hpMul: 1.55, speedMul: 1.14 },
  { types: ['drifter', 'dart', 'spitter', 'bulwark'], interval: 0.75, batch: 3, hpMul: 1.7, speedMul: 1.16 },
  { types: ['dart', 'bulwark'], interval: 1.2, batch: 2, hpMul: 1.85, speedMul: 1.18, boss: true },
];
export const WAVE_SECONDS = 30;
export const MAX_ENEMIES = 90;

// Upgrade pool: id, display name, one-line description, max stacks.
// apply() mutates the player's build; desc() shows the next rank's effect.
export const UPGRADES = [
  { id: 'pulse', name: 'Nova Surge', desc: '+30% nova damage, +12% radius', max: 5 },
  { id: 'orbit', name: 'Ember Orbit', desc: '+1 orbiting spark, +20% damage', max: 4 },
  { id: 'beam', name: 'Starlance', desc: '+1 bolt, +15% damage', max: 4 },
  { id: 'swift', name: 'Drift Boots', desc: '+12% move speed', max: 4 },
  { id: 'vitality', name: 'Lantern Wick', desc: '+25 max HP and heal 25', max: 5 },
  { id: 'magnet', name: 'Shard Charm', desc: '+70% shard pickup radius', max: 3 },
  { id: 'armor', name: 'Umbral Plating', desc: 'take 15% less damage', max: 4 },
  { id: 'regen', name: 'Ember Heart', desc: 'regenerate +0.8 HP per second', max: 4 },
  { id: 'dash', name: 'Quickstep', desc: 'dash recharges 25% faster', max: 3 },
  { id: 'greed', name: 'Gilded Light', desc: 'shards grant +1 XP each', max: 3 },
];

export const COLORS = {
  bg0: '#070510',
  bg1: '#120a2e',
  wall: '#2d1b69',
  player: '#fde68a',
  playerCore: '#fff7cc',
  shard: '#67e8f9',
  hp: '#4ade80',
  hpLow: '#f87171',
  xp: '#67e8f9',
  text: '#e9e4ff',
  dim: '#9d94c7',
  gold: '#fbbf24',
};
