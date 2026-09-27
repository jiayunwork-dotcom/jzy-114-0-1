import { resolveEffectiveRate } from '../../src/domain/kinetics';

describe('速率常数解析管线', () => {
  test('不给任何修正：原 k 原样返回，两段修正均标 applied=false', () => {
    const r = resolveEffectiveRate({ k: 100 });
    expect(r.k).toBe(100);
    expect(r.temperatureCorrection.applied).toBe(false);
    expect(r.pressureCorrection.applied).toBe(false);
  });

  test('先 Arrhenius 再分压：回显中间值，分压修正的输入是 Arrhenius 后的 k', () => {
    const r = resolveEffectiveRate({
      k: 100,
      activationEnergy: 200_000,
      gasConstant: 8.314,
      temperature: 1173.15,
      referenceTemperature: 1073.15,
      pO2: 0.4,
      pO2Ref: 0.1,
      oxygenPressureExponent: 1 / 6
    });
    expect(r.temperatureCorrection.applied).toBe(true);
    expect(r.pressureCorrection.applied).toBe(true);
    const kArr = r.temperatureCorrection.kAfterArrhenius!;
    expect(r.pressureCorrection.kBefore).toBeCloseTo(kArr, 10);
    expect(r.k).toBeCloseTo(kArr * Math.pow(4, 1 / 6), 10);
  });

  test('温度修正三件套缺一不可：半截子修正直接拒绝', () => {
    expect(() => resolveEffectiveRate({ k: 100, activationEnergy: 200_000, temperature: 1173.15 })).toThrow();
  });
});
