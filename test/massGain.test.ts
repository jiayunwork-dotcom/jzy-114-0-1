import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assessParabolicApplicability,
  massGainPerArea,
  pillingBedworthRatio,
} from '../src/massGain';
import { approxEqual } from './util';

test('质量增益 = 膜厚 × 氧化物密度', () => {
  // 30 µm 的 Fe2O3（密度 5240 kg/m^3）→ 0.1572 kg/m^2
  assert.ok(approxEqual(massGainPerArea(3e-5, 5240), 0.1572));
});

test('PBR：Fe 上生成 Fe2O3，比值 > 1，适用抛物律', () => {
  const ratio = pillingBedworthRatio({
    metalMolarMass: 55.845,
    metalDensity: 7874,
    oxideMolarMass: 159.687,
    oxideDensity: 5240,
    metalAtomsPerOxideUnit: 2,
  });
  assert.ok(approxEqual(ratio, 2.14, 0.01), `Fe/Fe2O3 的 PBR 应约 2.14，实际 ${ratio}`);
  const assessment = assessParabolicApplicability(ratio);
  assert.equal(assessment.parabolicApplicable, true);
});

test('PBR：Mg 上生成 MgO，比值 < 1，不适用抛物律', () => {
  const ratio = pillingBedworthRatio({
    metalMolarMass: 24.305,
    metalDensity: 1738,
    oxideMolarMass: 40.304,
    oxideDensity: 3580,
    metalAtomsPerOxideUnit: 1,
  });
  assert.ok(ratio < 1, `Mg/MgO 的 PBR 应小于 1，实际 ${ratio}`);
  const assessment = assessParabolicApplicability(ratio);
  assert.equal(assessment.parabolicApplicable, false);
  assert.match(assessment.note, /线性律/);
});
