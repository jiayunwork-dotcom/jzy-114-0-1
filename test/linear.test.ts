import assert from 'node:assert/strict';
import { test } from 'node:test';
import { linearThickness } from '../src/linear';
import { approxEqual } from './util';

/**
 * 线性律（x = k·t）：与抛物律互为对照。
 * 时间放大 4 倍 → 膜厚也放大 4 倍，这正是两条律的分水岭。
 */

const KL = 1e-9; // m/s

test('线性律：膜厚 = 速率常数 × 时间', () => {
  assert.ok(approxEqual(linearThickness(KL, 3600), 3.6e-6));
});

test('线性律：时间放大 4 倍，膜厚也放大 4 倍（x ∝ t）', () => {
  const ratio = linearThickness(KL, 4 * 3600) / linearThickness(KL, 3600);
  assert.ok(approxEqual(ratio, 4), `线性律比值应为 4，实际 ${ratio}`);
});

test('线性律：时间为零时膜厚为零', () => {
  assert.equal(linearThickness(KL, 0), 0);
});
