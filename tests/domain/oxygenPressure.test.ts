import { oxygenPressureRateConstant } from '../../src/domain/oxygenPressure';

describe('氧分压指数修正 k(pO2) = k_ref·(pO2/pO2_ref)^n', () => {
  test('指数为正：分压升高，k 增大', () => {
    const k = oxygenPressureRateConstant({ k: 100, pO2: 0.4, pO2Ref: 0.1, exponent: 1 / 6 });
    expect(k).toBeCloseTo(100 * Math.pow(4, 1 / 6), 10);
    expect(k).toBeGreaterThan(100);
  });

  test('指数为负：分压升高，k 反而减小（如某些 n 型缺陷体系）', () => {
    const k = oxygenPressureRateConstant({ k: 100, pO2: 0.4, pO2Ref: 0.1, exponent: -1 / 4 });
    expect(k).toBeLessThan(100);
  });

  test('pO2 = pO2Ref 时 k 不变；缺省参考分压为 1', () => {
    expect(oxygenPressureRateConstant({ k: 100, pO2: 0.21, pO2Ref: 0.21, exponent: 1 / 6 })).toBeCloseTo(100, 10);
    expect(oxygenPressureRateConstant({ k: 100, pO2: 1, exponent: 1 / 6 })).toBeCloseTo(100, 10);
  });

  test('分压非正被拒绝', () => {
    expect(() => oxygenPressureRateConstant({ k: 100, pO2: 0, exponent: 1 / 6 })).toThrow();
  });
});
