import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parabolicThickness } from '../src/parabolic';
import { approxEqual } from './util';

/**
 * 抛物律（x = √(k·t)）的核心不变量：
 * - 时间放大 4 倍 → 膜厚恰好翻 1 倍；
 * - 速率常数翻 1 倍 → 膜厚按 √2 倍增大；
 * - t = 0 → x = 0。
 * 若有人把抛物入口错写成 x ∝ t，"时间 4 倍"会退化成膜厚 4 倍，
 * 下面的测试必须能把这种错抓出来。
 */

const KP = 2.5e-13; // m^2/s，铁在高温氧化下的量级

test('时间放大到 4 倍，膜厚正好翻一倍（x ∝ √t）', () => {
  const t = 3600;
  const x1 = parabolicThickness(KP, t);
  const x4 = parabolicThickness(KP, 4 * t);
  assert.ok(approxEqual(x4 / x1, 2), `比值应为 2，实际 ${x4 / x1}`);
});

test('速率常数翻倍，膜厚按 √2 倍增大', () => {
  const t = 3600;
  const x1 = parabolicThickness(KP, t);
  const x2 = parabolicThickness(2 * KP, t);
  assert.ok(approxEqual(x2 / x1, Math.SQRT2), `比值应为 √2，实际 ${x2 / x1}`);
});

test('时间为零时膜厚为零', () => {
  assert.equal(parabolicThickness(KP, 0), 0);
});

test('防退化：时间 4 倍时膜厚绝不是 4 倍（抛物律不是线性律）', () => {
  const t = 3600;
  const ratio = parabolicThickness(KP, 4 * t) / parabolicThickness(KP, t);
  assert.ok(approxEqual(ratio, 2), `比值应为 2，实际 ${ratio}`);
  assert.ok(!approxEqual(ratio, 4, 0.1), `比值不得退化为 4，实际 ${ratio}`);
});

test('铁氧化皮基准算例：k_p = 2.5e-13 m^2/s 时膜厚随 √t 增长', () => {
  // 1 h → 30 µm，4 h → 60 µm，9 h → 90 µm，肉眼可核的 √t 序列
  const x1h = parabolicThickness(KP, 3600);
  const x4h = parabolicThickness(KP, 14400);
  const x9h = parabolicThickness(KP, 32400);
  assert.ok(approxEqual(x1h, 3e-5), `1 h 膜厚应为 30 µm，实际 ${x1h}`);
  assert.ok(approxEqual(x4h, 6e-5), `4 h 膜厚应为 60 µm，实际 ${x4h}`);
  assert.ok(approxEqual(x9h, 9e-5), `9 h 膜厚应为 90 µm，实际 ${x9h}`);
  assert.ok(approxEqual(x4h / x1h, 2));
  assert.ok(approxEqual(x9h / x1h, 3));
});
