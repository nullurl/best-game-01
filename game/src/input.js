// Keyboard and mouse state, polled by the world each step. Keys are
// tracked by code (KeyW, ArrowUp, Space, ...) so layouts do not matter.
// Clicks are queued with canvas coordinates and consumed by the screens
// (title, level-up cards, restart buttons).

export function createInput() {
  return {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    clicks: [],
    pressed: new Set(),
  };
}

export function attachInput(input, canvas) {
  const onKeyDown = (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) input.pressed.add(event.code);
    input.keys.add(event.code);
  };
  const onKeyUp = (event) => input.keys.delete(event.code);
  const onBlur = () => {
    input.keys.clear();
    input.mouseDown = false;
  };
  const toCanvas = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };
  const onMouseMove = (event) => {
    const p = toCanvas(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
  };
  const onMouseDown = (event) => {
    const p = toCanvas(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.mouseDown = true;
    input.clicks.push({ x: p.x, y: p.y });
  };
  const onMouseUp = () => {
    input.mouseDown = false;
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
  };
}

/** True while the key is held. */
export function keyDown(input, code) {
  return input.keys.has(code);
}

/** True once, on the step the key went down; consumed by endStep. */
export function keyPressed(input, code) {
  return input.pressed.has(code);
}

/** Movement vector from WASD/arrows, normalized, as {x, y}. */
export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (keyDown(input, 'KeyA') || keyDown(input, 'ArrowLeft')) x -= 1;
  if (keyDown(input, 'KeyD') || keyDown(input, 'ArrowRight')) x += 1;
  if (keyDown(input, 'KeyW') || keyDown(input, 'ArrowUp')) y -= 1;
  if (keyDown(input, 'KeyS') || keyDown(input, 'ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.SQRT2;
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

/** Drain the click queue; call once per frame after the screens read it. */
export function drainClicks(input) {
  const clicks = input.clicks;
  input.clicks = [];
  return clicks;
}

/** Clear one-shot state at the end of each frame. */
export function endFrame(input) {
  input.pressed.clear();
}
