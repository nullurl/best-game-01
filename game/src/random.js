// Seeded randomness (mulberry32): the whole game runs off one generator
// owned by the world, so a screenshot scene staged from a seed always
// renders the same frame, and a run can be replayed exactly.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Float in [min, max). */
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

/** Integer in [min, max] inclusive. */
export function int(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** True with probability p. */
export function chance(rng, p) {
  return rng() < p;
}

/** One element of a non-empty array, uniformly. */
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

/** k distinct elements of items, in random order (k <= items.length). */
export function sample(rng, items, k) {
  const pool = items.slice();
  const out = [];
  for (let i = 0; i < k && pool.length > 0; i += 1) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return out;
}
