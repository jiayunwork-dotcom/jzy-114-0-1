/**
 * Arrhenius 温度修正测试。
 * 题目第三把尺子：其它相同，温度调高 -> k 变大 -> 同时间膜更厚。
 */
import { arrheniusRateConstant } from '../../src/domain/arrhenius';
import { parabolicThickness } from '../../src/domain/parabolic';

const Q = 200_000; // J/mol，铁氧化皮常见量级
const R = 8.314;
const T_REF = 1073.15; // 800 ℃
const KP_REF = 100; // µm²/h（参考温度下）

describe('Arrhenius k(T) 修正', () => {
  test('温度调高，速率常数单调变大', () => {
    const kLow = arrheniusRateConstant({
      kRef: KP_REF,
      activationEnergy: Q,
      gasConstant: R,
      temperature: T_REF,
      referenceTemperature: T_REF
    });
    const kHigh = arrheniusRateConstant({
      kRef: KP_REF,
      activationEnergy: Q,
      gasConstant: R,
      temperature: 1173.15, // 900 ℃
      referenceTemperature: T_REF
    });
    expect(kLow).toBeCloseTo(KP_REF, 6); // T=Tref 时不变
    expect(kHigh).toBeGreaterThan(KP_REF);
  });

  test('温度调低，速率常数变小', () => {
    const kCold = arrheniusRateConstant({
      kRef: KP_REF,
      activationEnergy: Q,
      gasConstant: R,
      temperature: 1023.15, // 750 ℃
      referenceTemperature: T_REF
    });
    expect(kCold).toBeLessThan(KP_REF);
  });

  test('整条链路：温度升高，相同时间下抛物膜更厚', () => {
    const k900 = arrheniusRateConstant({
      kRef: KP_REF,
      activationEnergy: Q,
      gasConstant: R,
      temperature: 1173.15,
      referenceTemperature: T_REF
    });
    const x800 = parabolicThickness(KP_REF, 4).thickness;
    const x900 = parabolicThickness(k900, 4).thickness;
    expect(x900).toBeGreaterThan(x800);
  });

  test('摄氏温度（900）误当开尔文传入：在计算前被拒绝', () => {
    expect(() =>
      arrheniusRateConstant({
        kRef: KP_REF,
        activationEnergy: Q,
        gasConstant: R,
        temperature: 900, // 忘加 273.15
        referenceTemperature: T_REF
      })
    ).toThrow(/开尔文/);
  });

  test('激活能/R 非正数被拒绝', () => {
    expect(() =>
      arrheniusRateConstant({ kRef: KP_REF, activationEnergy: 0, gasConstant: R, temperature: 1173.15 })
    ).toThrow();
    expect(() =>
      arrheniusRateConstant({ kRef: KP_REF, activationEnergy: Q, gasConstant: -8.314, temperature: 1173.15 })
    ).toThrow();
  });
});
