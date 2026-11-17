// Procedural sound: every effect is a small oscillator envelope, so the
// game ships no audio files and loads nothing. The context is created on
// the first user gesture (browsers block audio before one); until then
// every call is a no-op. M mutes, and the choice persists in localStorage.

let ctx = null;
let master = null;
let muted = false;
try {
  muted = window.localStorage.getItem('voidlight-muted') === '1';
} catch {
  muted = false;
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  try {
    window.localStorage.setItem('voidlight-muted', muted ? '1' : '0');
  } catch {
    // Storage unavailable: the toggle still works for this session.
  }
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

/** Create the context on a user gesture; safe to call repeatedly. */
export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
}

function tone(freq, endFreq, duration, type, volume, delay = 0) {
  if (!ctx || !master || muted) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + duration);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function noise(duration, volume, delay = 0, lowpass = 1200) {
  if (!ctx || !master || muted) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t0);
}

export const sfx = {
  shoot() {
    tone(880, 520, 0.09, 'sine', 0.12);
  },
  nova() {
    tone(220, 660, 0.22, 'triangle', 0.2);
    noise(0.15, 0.08, 0, 900);
  },
  hit() {
    tone(300, 180, 0.06, 'square', 0.05);
  },
  kill() {
    tone(520, 90, 0.16, 'sawtooth', 0.1);
    noise(0.12, 0.1, 0, 1600);
  },
  pickup() {
    tone(1180, 1560, 0.07, 'sine', 0.09);
  },
  levelup() {
    tone(523, 523, 0.12, 'triangle', 0.16);
    tone(659, 659, 0.12, 'triangle', 0.16, 0.09);
    tone(784, 784, 0.2, 'triangle', 0.18, 0.18);
  },
  hurt() {
    tone(160, 60, 0.25, 'sawtooth', 0.22);
    noise(0.2, 0.14, 0, 700);
  },
  dash() {
    noise(0.18, 0.12, 0, 2400);
  },
  boss() {
    tone(98, 49, 0.7, 'sawtooth', 0.25);
    tone(147, 73, 0.7, 'triangle', 0.18, 0.05);
  },
  click() {
    tone(700, 900, 0.05, 'sine', 0.1);
  },
  gameover() {
    tone(392, 392, 0.25, 'triangle', 0.18);
    tone(311, 311, 0.25, 'triangle', 0.18, 0.25);
    tone(233, 116, 0.6, 'triangle', 0.2, 0.5);
  },
  victory() {
    tone(523, 523, 0.15, 'triangle', 0.18);
    tone(659, 659, 0.15, 'triangle', 0.18, 0.14);
    tone(784, 784, 0.15, 'triangle', 0.18, 0.28);
    tone(1047, 1047, 0.4, 'triangle', 0.2, 0.42);
  },
};
