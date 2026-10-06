// Regression test: 3D orbit rotation math (run: node test-rotate.mjs)
import { readFileSync } from 'node:fs';
import assert from 'node:assert';

const src = readFileSync(new URL('./app.js', import.meta.url), 'utf8');

// Pull the pure projection helpers out of app.js and evaluate them in isolation.
function extract(name) {
  const m = src.match(new RegExp(`function ${name}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}`));
  assert.ok(m, `${name} not found in app.js`);
  return m[0];
}
const factory = new Function(`${extract('project3D')}\n${extract('depth3D')}\nreturn { project3D, depth3D };`);
const { project3D, depth3D } = factory();

const cam = { az: Math.PI / 4, el: 0.49, scale: 0.88, ox: 460, oy: 88 };
const pt = [140, 90, 0];

const base = project3D(...pt, cam);
const turned = project3D(...pt, { ...cam, az: cam.az + Math.PI / 2 });
assert.ok(
  Math.hypot(turned[0] - base[0], turned[1] - base[1]) > 20,
  `rotating 90° should visibly move the point (base=${base}, turned=${turned})`,
);

const full = project3D(...pt, { ...cam, az: cam.az + Math.PI * 2 });
assert.ok(Math.abs(full[0] - base[0]) < 1e-6 && Math.abs(full[1] - base[1]) < 1e-6, '360° rotation returns to start');

const opposite = project3D(...pt, { ...cam, az: cam.az + Math.PI });
assert.ok(Math.abs((opposite[0] - cam.ox) + (base[0] - cam.ox)) < 1e-6, '180° rotation mirrors X around center');

const raised = project3D(140, 90, 9, cam);
assert.ok(raised[1] < base[1], 'higher z must project higher on screen');

assert.ok(depth3D(500, 400, cam) !== depth3D(60, 40, cam), 'depth ordering differs across the plan');

console.log('test-rotate: all assertions passed');
