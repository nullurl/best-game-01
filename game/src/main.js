// VOIDLIGHT entrypoint: boots the canvas, runs the fixed-timestep loop
// and owns the screen state machine (title, play, level-up, pause, game
// over, victory). ?shot=<scene>&seed=<n> stages a deterministic
// screenshot scene instead of a live game; the frame is then frozen.

import { FIELD, STEP } from './config.js';
import { attachInput, createInput, drainClicks, endFrame, keyPressed, moveVector } from './input.js';
import { ensureAudio, sfx, toggleMute } from './audio.js';
import {
  EVENT_LEVELUP,
  EVENT_OVER,
  EVENT_WIN,
  createWorld,
  loadBest,
  resetWorld,
  saveBest,
  stepWorld,
} from './world.js';
import { applyUpgrade, buildStats } from './weapons.js';
import { drawEnd, drawHUD, drawLevelUp, drawPause, drawTitle, drawWorld, levelUpCards } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) && seedParam > 0 ? Math.floor(seedParam) : (Date.now() % 100000) + 1;

const world = createWorld(seed);
const input = createInput();
attachInput(input, canvas);

let screen = 'title';
let best = loadBest();
let hoverCard = -1;
let acc = 0;
let last = performance.now();

// Screenshot mode: stage the scene once and freeze the frame.
if (shotName) {
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  best = staged.best;
}

function startGame() {
  ensureAudio();
  resetWorld(world);
  screen = 'play';
  sfx.click();
}

function chooseUpgrade(index) {
  const choice = world.choices[index];
  if (!choice) return;
  applyUpgrade(world, choice.id);
  world.stats = buildStats(world.player.build);
  world.choices = [];
  screen = 'play';
  sfx.click();
}

function pointIn(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function handleClicks(clicks) {
  if (clicks.length === 0) return;
  ensureAudio();
  const click = clicks[0];
  if (screen === 'title') {
    startGame();
  } else if (screen === 'levelup') {
    const cards = levelUpCards();
    for (let i = 0; i < cards.length; i += 1) {
      if (pointIn(cards[i], click.x, click.y)) {
        chooseUpgrade(i);
        return;
      }
    }
  } else if (screen === 'over' || screen === 'win') {
    startGame();
  }
}

function handleKeys() {
  if (keyPressed(input, 'KeyM')) toggleMute();
  if (screen === 'title') {
    if (keyPressed(input, 'Enter') || keyPressed(input, 'Space')) startGame();
  } else if (screen === 'play') {
    if (keyPressed(input, 'KeyP') || keyPressed(input, 'Escape')) {
      screen = 'pause';
      sfx.click();
    }
  } else if (screen === 'pause') {
    if (keyPressed(input, 'KeyP') || keyPressed(input, 'Escape') || keyPressed(input, 'Enter')) {
      screen = 'play';
      sfx.click();
    }
  } else if (screen === 'levelup') {
    if (keyPressed(input, 'Digit1')) chooseUpgrade(0);
    if (keyPressed(input, 'Digit2')) chooseUpgrade(1);
    if (keyPressed(input, 'Digit3')) chooseUpgrade(2);
  } else if (screen === 'over' || screen === 'win') {
    if (keyPressed(input, 'KeyR') || keyPressed(input, 'Enter') || keyPressed(input, 'Space')) startGame();
  }
}

function updateHover() {
  hoverCard = -1;
  if (screen !== 'levelup') return;
  const cards = levelUpCards();
  for (let i = 0; i < cards.length; i += 1) {
    if (pointIn(cards[i], input.mouseX, input.mouseY)) hoverCard = i;
  }
}

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  if (!shotName) {
    handleKeys();
    handleClicks(drainClicks(input));
    updateHover();
    if (screen === 'play') {
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 5) {
        acc -= STEP;
        steps += 1;
        const mv = moveVector(input);
        const events = stepWorld(world, { mx: mv.x, my: mv.y, dash: keyPressed(input, 'Space') }, STEP);
        if (events & EVENT_LEVELUP) {
          screen = 'levelup';
          acc = 0;
          break;
        }
        if (events & EVENT_WIN) {
          screen = 'win';
          best = saveBest(world.score);
          sfx.victory();
          break;
        }
        if (events & EVENT_OVER) {
          screen = 'over';
          best = saveBest(world.score);
          sfx.gameover();
          break;
        }
      }
      if (steps >= 5) acc = 0;
    }
    endFrame(input);
  }

  drawWorld(ctx, world);
  if (screen === 'title') {
    drawTitle(ctx, best);
  } else {
    drawHUD(ctx, world, screen === 'play');
    if (screen === 'levelup') drawLevelUp(ctx, world, hoverCard);
    else if (screen === 'pause') drawPause(ctx);
    else if (screen === 'over') drawEnd(ctx, world, best, false);
    else if (screen === 'win') drawEnd(ctx, world, best, true);
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
