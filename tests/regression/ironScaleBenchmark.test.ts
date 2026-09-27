/**
 * 铁氧化皮基准回归：膜厚严格随 √t 增长的整条曲线被钉死。
 * 任何人把抛物入口错改成 x∝t，4 h 就会算成 400 µm（正确为 200 µm），本测试立即失败。
 */
import { parabolicThickness } from '../../src/domain/parabolic';
import { massGainPerArea } from '../../src/domain/film';
import { IRON_SCALE_BENCHMARK as b } from '../fixtures/ironScale';

describe('铁氧化皮 900℃ 基准回归（kp=10000 µm²/h）', () => {
  test.each([...b.series])('t=$timeH h -> x=$thicknessUm µm', ({ timeH, thicknessUm }) => {
    const x = parabolicThickness(b.kpUm2PerH, timeH).thickness;
    expect(x).toBeCloseTo(thicknessUm, 8);
  });

  test.each([...b.series])(
    't=$timeH h 质量增益 Δm/A=$massGainKgM2 kg/m²',
    ({ timeH, massGainKgM2 }) => {
      const thicknessUm = Math.sqrt(b.kpUm2PerH * timeH);
      expect(massGainPerArea(thicknessUm, b.densityKgM3)).toBeCloseTo(massGainKgM2, 8);
    }
  );

  test('整条曲线 x/√t 恒为 √kp —— 抛物律的肉眼判据', () => {
    for (const { timeH, thicknessUm } of b.series) {
      expect(thicknessUm / Math.sqrt(timeH)).toBeCloseTo(Math.sqrt(b.kpUm2PerH), 8);
    }
  });

  test('时间四倍、膜厚两倍，在真实数量级数据上再钉一遍', () => {
    const x1 = parabolicThickness(b.kpUm2PerH, 1).thickness;
    const x4 = parabolicThickness(b.kpUm2PerH, 4).thickness;
    expect(x4).toBeCloseTo(2 * x1, 8);
    expect(x1).toBeCloseTo(100, 8);
    expect(x4).toBeCloseTo(200, 8);
  });

  test('质量增益基准：100 µm -> 0.52 kg/m²，400 µm -> 2.08 kg/m²', () => {
    expect(massGainPerArea(100, b.densityKgM3)).toBeCloseTo(0.52, 8);
    expect(massGainPerArea(400, b.densityKgM3)).toBeCloseTo(2.08, 8);
  });
});
