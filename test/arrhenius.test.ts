import assert from 'node:assert/strict';
import { test } from 'node:test';
import { arrheniusCorrect } from '../src/arrhenius';
import { parabolicThickness } from '../src/parabolic';
import { ComputationError } from '../src/errors';

/** Arrhenius 温度修正：其它条件相同，温度调高 → 速率常数变大 → 同时间膜更厚 */

const Q = 96_000; // J/mol
const R = 8.314; // J/(mol·K)
const K_REF = 2.5e-13; // m^2/s，T_ref = 1000 K 下的实测值

test('参考温度模式下：温度升高，速率常数变大', () => {
  const kLow = arrheniusCorrect(K_REF, {
    activationEnergy: Q,
    gasConstant: R,
    temperature: 1000,
    referenceTemperature: 1000,
  });
  const kHigh = arrheniusCorrect(K_REF, {
    activationEnergy: Q,
    gasConstant: R,
    temperature: 1100,
    referenceTemperature: 1000,
  });
  assert.equal(kLow, K_REF); // T == T_ref 时不变
  assert.ok(kHigh > kLow, `升温后 k 应增大：${kLow} → ${kHigh}`);
});

test('指前因子模式下：温度升高，速率常数同样变大', () => {
  const a = 1e-6; // 指前因子 A，m^2/s
  const kLow = arrheniusCorrect(a, { activationEnergy: Q, gasConstant: R, temperature: 1000 });
  const kHigh = arrheniusCorrect(a, { activationEnergy: Q, gasConstant: R, temperature: 1100 });
  assert.ok(kHigh > kLow, `升温后 k 应增大：${kLow} → ${kHigh}`);
});

test('同样的时间，温度越高膜越厚', () => {
  const t = 3600;
  const xLow = parabolicThickness(
    arrheniusCorrect(K_REF, { activationEnergy: Q, gasConstant: R, temperature: 1000, referenceTemperature: 1000 }),
    t,
  );
  const xHigh = parabolicThickness(
    arrheniusCorrect(K_REF, { activationEnergy: Q, gasConstant: R, temperature: 1100, referenceTemperature: 1000 }),
    t,
  );
  assert.ok(xHigh > xLow, `同时间下高温膜应更厚：${xLow} → ${xHigh}`);
});

test('指数溢出时抛 ComputationError，而不是放出 Infinity', () => {
  assert.throws(
    () =>
      arrheniusCorrect(K_REF, {
        activationEnergy: 1e308,
        gasConstant: R,
        temperature: 273.15,
        referenceTemperature: 6000,
      }),
    ComputationError,
  );
});
