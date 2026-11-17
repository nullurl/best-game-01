// All drawing: the starfield arena, every entity, the HUD and the
// screens (title, level-up, pause, game over, victory). Everything is
// canvas vector art, no image files, so the game loads nothing. The
// level-up card rectangles are computed here and shared with main.js,
// so clicks land exactly on the cards drawn.

import { COLORS, FIELD, PLAYER, WEAPONS } from './config.js';
import { makeRng, range } from './random.js';

// Fixed starfield: same sky every run, computed once from a fixed seed.
let stars = null;
let nebulae = null;
function ensureSky() {
  if (stars) return;
  const rng = makeRng(20261117);
  stars = [];
  for (let i = 0; i < 170; i += 1) {
    stars.push({
      x: rng() * FIELD.width,
      y: rng() * FIELD.height,
      r: range(rng, 0.5, 1.8),
      a: range(rng, 0.25, 0.9),
      tw: range(rng, 0, Math.PI * 2),
    });
  }
  nebulae = [
    { x: 260, y: 200, r: 300, c: 'rgba(76, 29, 149, 0.20)' },
    { x: 1020, y: 560, r: 340, c: 'rgba(8, 145, 178, 0.13)' },
    { x: 640, y: 700, r: 260, c: 'rgba(190, 24, 93, 0.10)' },
  ];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = 700) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Segoe UI", system-ui, -apple-system, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function bar(ctx, x, y, w, h, frac, color, bg = 'rgba(255,255,255,0.12)') {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  if (frac > 0) {
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

export function drawWorld(ctx, world) {
  ensureSky();
  const t = world.time;
  ctx.save();
  if (world.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  // Background: deep gradient, nebulae, twinkling stars.
  const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  g.addColorStop(0, COLORS.bg0);
  g.addColorStop(1, COLORS.bg1);
  ctx.fillStyle = g;
  ctx.fillRect(-12, -12, FIELD.width + 24, FIELD.height + 24);
  for (const n of nebulae) {
    const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    ng.addColorStop(0, n.c);
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }
  for (const s of stars) {
    ctx.globalAlpha = s.a * (0.7 + 0.3 * Math.sin(t * 1.4 + s.tw));
    ctx.fillStyle = '#d8ccff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Arena wall.
  ctx.strokeStyle = COLORS.wall;
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, FIELD.width - 16, FIELD.height - 16);
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(14, 14, FIELD.width - 28, FIELD.height - 28);

  // Shards: cyan diamonds with a soft glow.
  for (const s of world.shards) {
    const pulse = 1 + 0.15 * Math.sin(t * 6 + s.x);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = 'rgba(103, 232, 249, 0.25)';
    ctx.fillRect(-9 * pulse, -9 * pulse, 18 * pulse, 18 * pulse);
    ctx.fillStyle = COLORS.shard;
    ctx.fillRect(-5 * pulse, -5 * pulse, 10 * pulse, 10 * pulse);
    ctx.restore();
  }
  // Heart pickups.
  for (const u of world.pickups) {
    ctx.fillStyle = '#f87171';
    ctx.font = '700 22px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♥', u.x, u.y + Math.sin(t * 4) * 2);
  }

  // Enemies, each type its own silhouette.
  for (const e of world.enemies) {
    const alpha = e.spawnIn > 0 ? 0.35 + 0.3 * Math.sin(t * 20) : 1;
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(e.x, e.y);
    const flash = e.flash > 0;
    const body = flash ? '#ffffff' : { drifter: '#a78bfa', dart: '#f472b6', bulwark: '#fb923c', spitter: '#4ade80', warden: '#f87171' }[e.type];
    if (e.type === 'drifter') {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e1033';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'dart') {
      const a = Math.atan2(world.player.y - e.y, world.player.x - e.x);
      ctx.rotate(a);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(e.radius * 1.4, 0);
      ctx.lineTo(-e.radius, e.radius);
      ctx.lineTo(-e.radius * 0.5, 0);
      ctx.lineTo(-e.radius, -e.radius);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'bulwark') {
      ctx.fillStyle = body;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const px = Math.cos(a) * e.radius;
        const py = Math.sin(a) * e.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (e.type === 'spitter') {
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = body;
      ctx.fillRect(-e.radius * 0.8, -e.radius * 0.8, e.radius * 1.6, e.radius * 1.6);
      ctx.fillStyle = '#052e16';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Warden: big ringed orb with a crown of spikes.
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fecaca';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 8 + Math.sin(t * 3) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#7f1d1d';
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * e.radius * 0.62, Math.sin(a) * e.radius * 0.62, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff7cc';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // HP bar for tough enemies.
    if (e.maxHp >= 40 && e.hp < e.maxHp) {
      bar(ctx, e.x - e.radius, e.y - e.radius - 14, e.radius * 2, 5, e.hp / e.maxHp, '#f87171');
    }
  }
  ctx.globalAlpha = 1;

  // Nova ring.
  if (world.nova) {
    const n = world.nova;
    const f = 1 - n.life / n.maxLife;
    ctx.strokeStyle = `rgba(253, 230, 138, ${0.8 * (1 - f)})`;
    ctx.lineWidth = 10 * (1 - f) + 2;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius * (0.3 + 0.7 * f), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Player shots.
  for (const s of world.shots) {
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(254, 240, 138, 0.3)';
    ctx.fill();
    ctx.fillStyle = '#fffbe6';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  // Enemy orbs.
  for (const s of world.enemyShots) {
    ctx.fillStyle = 'rgba(248, 113, 113, 0.35)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Orbiters.
  const p = world.player;
  const st = world.stats;
  if (st.orbitCount > 0) {
    for (let i = 0; i < st.orbitCount; i += 1) {
      const a = p.orbitAngle + (i / st.orbitCount) * Math.PI * 2;
      const ox = p.x + Math.cos(a) * WEAPONS.orbit.orbitRadius;
      const oy = p.y + Math.sin(a) * WEAPONS.orbit.orbitRadius;
      ctx.fillStyle = 'rgba(253, 224, 71, 0.3)';
      ctx.beginPath();
      ctx.arc(ox, oy, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(ox, oy, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Player: the lantern wisp — glow, ring, flame core.
  const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 90);
  glow.addColorStop(0, 'rgba(253, 230, 138, 0.35)');
  glow.addColorStop(1, 'rgba(253, 230, 138, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = p.invuln > 0 && Math.floor(t * 16) % 2 === 0 ? 0.45 : 1;
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = COLORS.playerCore;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 7 + Math.sin(t * 8) * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Particles and damage numbers.
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    text(ctx, f.text, f.x, f.y, 15, f.color);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function drawHUD(ctx, world, showBanner = true) {
  const p = world.player;
  const w = FIELD.width;
  // Translucent band behind the top row, so wandering shades never
  // clutter the readouts.
  ctx.fillStyle = 'rgba(7, 5, 16, 0.55)';
  ctx.fillRect(0, 0, w, 74);
  // XP bar across the top.
  bar(ctx, 0, 0, w, 10, p.xp / p.xpNext, COLORS.xp, 'rgba(255,255,255,0.08)');
  // HP + level, top left.
  text(ctx, `LV ${p.level}`, 24, 34, 20, COLORS.gold, 'left');
  bar(ctx, 86, 24, 220, 18, p.hp / p.maxHp, p.hp / p.maxHp < 0.3 ? COLORS.hpLow : COLORS.hp);
  text(ctx, `${Math.ceil(p.hp)} / ${p.maxHp}`, 196, 34, 13, '#ffffff');
  // Dash pips under the HP bar.
  const dashReady = p.dashCd <= 0;
  ctx.fillStyle = dashReady ? '#67e8f9' : 'rgba(255,255,255,0.25)';
  roundRect(ctx, 86, 50, 64, 10, 5);
  ctx.fill();
  text(ctx, dashReady ? 'DASH READY [SPACE]' : 'dash…', 158, 56, 11, dashReady ? '#a5f3fc' : COLORS.dim, 'left');
  // Wave + timer, top centre.
  text(ctx, `WAVE ${world.wave} / 10`, w / 2, 32, 22, COLORS.text);
  text(ctx, fmtTime(world.time), w / 2, 58, 15, COLORS.dim);
  // Score + kills, top right.
  text(ctx, `SCORE ${world.score}`, w - 24, 30, 20, COLORS.text, 'right');
  text(ctx, `${world.kills} shades banished · ${world.shardsGot} shards`, w - 24, 56, 13, COLORS.dim, 'right');
  // Boss bar.
  if (world.boss) {
    const b = world.boss;
    text(ctx, 'THE WARDEN', w / 2, 88, 16, '#fca5a5');
    bar(ctx, w / 2 - 260, 102, 520, 12, b.hp / b.maxHp, '#f87171');
  }
  // Wave banner (play screen only: overlays carry their own titles).
  if (showBanner && world.bannerTime > 0) {
    ctx.globalAlpha = Math.min(1, world.bannerTime);
    text(ctx, world.banner, w / 2, 150, 34, COLORS.gold);
    ctx.globalAlpha = 1;
  }
  // Low-HP vignette.
  if (p.hp / p.maxHp < 0.3 && !world.over) {
    const v = ctx.createRadialGradient(w / 2, 400, 300, w / 2, 400, 700);
    v.addColorStop(0, 'rgba(220,38,38,0)');
    v.addColorStop(1, `rgba(220,38,38,${0.35 + 0.15 * Math.sin(world.time * 5)})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, FIELD.height);
  }
  // Controls hint, bottom.
  text(ctx, 'WASD / arrows — move · SPACE — dash · P — pause · M — sound', w / 2, FIELD.height - 18, 13, COLORS.dim);
}

export function drawTitle(ctx, best) {
  ctx.fillStyle = 'rgba(7, 5, 16, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  text(ctx, 'V O I D L I G H T', FIELD.width / 2, 250, 84, COLORS.player);
  text(ctx, 'Last lantern of the Drift', FIELD.width / 2, 315, 24, COLORS.dim, 'center', 500);
  text(ctx, 'The shades hunger for your light. Survive 10 waves,', FIELD.width / 2, 380, 18, COLORS.text, 'center', 500);
  text(ctx, 'banish the Wardens, and bring back the dawn.', FIELD.width / 2, 406, 18, COLORS.text, 'center', 500);
  text(ctx, 'WASD move · SPACE dash · weapons fire on their own', FIELD.width / 2, 470, 16, COLORS.dim, 'center', 500);
  text(ctx, 'Level up to choose upgrades — build your lantern your way', FIELD.width / 2, 494, 16, COLORS.dim, 'center', 500);
  const pulse = 0.65 + 0.35 * Math.sin(Date.now() / 280);
  ctx.globalAlpha = pulse;
  text(ctx, '▶  CLICK OR PRESS ENTER TO BEGIN', FIELD.width / 2, 580, 26, COLORS.gold);
  ctx.globalAlpha = 1;
  if (best > 0) text(ctx, `Best score: ${best}`, FIELD.width / 2, 640, 16, COLORS.dim, 'center', 500);
  text(ctx, 'A game by an AI agent, for make.fun — original art, code and sound', FIELD.width / 2, FIELD.height - 18, 13, COLORS.dim, 'center', 500);
}

/** Card rectangles for the level-up screen, shared with main.js clicks. */
export function levelUpCards() {
  const w = 300;
  const h = 210;
  const gap = 28;
  const total = w * 3 + gap * 2;
  const x0 = (FIELD.width - total) / 2;
  const y = 300;
  return [0, 1, 2].map((i) => ({ x: x0 + i * (w + gap), y, w, h }));
}

export function drawLevelUp(ctx, world, hoverIndex) {
  ctx.fillStyle = 'rgba(7, 5, 16, 0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  text(ctx, `LEVEL ${world.player.level}`, FIELD.width / 2, 170, 30, COLORS.gold);
  text(ctx, 'Your lantern grows brighter — choose an upgrade', FIELD.width / 2, 215, 22, COLORS.text, 'center', 500);
  const cards = levelUpCards();
  world.choices.forEach((u, i) => {
    const c = cards[i];
    const rank = (world.player.build[u.id] || 0) + 1;
    ctx.fillStyle = hoverIndex === i ? 'rgba(76, 29, 149, 0.95)' : 'rgba(30, 16, 51, 0.95)';
    roundRect(ctx, c.x, c.y, c.w, c.h, 14);
    ctx.fill();
    ctx.strokeStyle = hoverIndex === i ? COLORS.gold : 'rgba(167, 139, 250, 0.5)';
    ctx.lineWidth = hoverIndex === i ? 3 : 1.5;
    ctx.stroke();
    text(ctx, `RANK ${rank}`, c.x + c.w / 2, c.y + 34, 13, COLORS.dim);
    text(ctx, u.name, c.x + c.w / 2, c.y + 72, 24, COLORS.text);
    // Word-wrap the description to two lines.
    const words = u.desc.split(' ');
    let line = '';
    const lines = [];
    for (const word of words) {
      if ((line + ' ' + word).trim().length > 26) {
        lines.push(line.trim());
        line = word;
      } else {
        line = `${line} ${word}`;
      }
    }
    lines.push(line.trim());
    lines.forEach((ln, li) => text(ctx, ln, c.x + c.w / 2, c.y + 122 + li * 24, 16, COLORS.dim, 'center', 500));
    text(ctx, `[ ${i + 1} ]`, c.x + c.w / 2, c.y + c.h - 28, 15, COLORS.gold);
  });
  text(ctx, 'Click a card or press 1 / 2 / 3', FIELD.width / 2, 560, 15, COLORS.dim, 'center', 500);
}

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(7, 5, 16, 0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  text(ctx, 'PAUSED', FIELD.width / 2, 360, 48, COLORS.text);
  text(ctx, 'Press P or ESC to resume', FIELD.width / 2, 420, 18, COLORS.dim, 'center', 500);
}

export function drawEnd(ctx, world, best, won) {
  ctx.fillStyle = won ? 'rgba(20, 40, 10, 0.62)' : 'rgba(16, 5, 10, 0.66)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  if (won) {
    text(ctx, 'DAWN RETURNS', FIELD.width / 2, 220, 64, COLORS.gold);
    text(ctx, 'The last Warden falls. Your lantern becomes the morning star.', FIELD.width / 2, 285, 20, COLORS.text, 'center', 500);
  } else {
    text(ctx, 'THE LIGHT GOES OUT', FIELD.width / 2, 220, 56, '#fca5a5');
    text(ctx, `The dark took your lantern on wave ${world.wave}.`, FIELD.width / 2, 285, 20, COLORS.text, 'center', 500);
  }
  text(ctx, `SCORE  ${world.score}`, FIELD.width / 2, 360, 34, COLORS.text);
  text(ctx, `Best  ${Math.max(best, world.score)}`, FIELD.width / 2, 400, 18, COLORS.dim, 'center', 500);
  const stats = `${world.kills} shades banished · ${world.shardsGot} shards · ${fmtTime(world.time)} survived · level ${world.player.level}`;
  text(ctx, stats, FIELD.width / 2, 450, 16, COLORS.dim, 'center', 500);
  const pulse = 0.65 + 0.35 * Math.sin(Date.now() / 280);
  ctx.globalAlpha = pulse;
  text(ctx, 'PRESS R OR CLICK TO PLAY AGAIN', FIELD.width / 2, 540, 24, COLORS.gold);
  ctx.globalAlpha = 1;
}
