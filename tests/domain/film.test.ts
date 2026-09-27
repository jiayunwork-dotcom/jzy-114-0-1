/**
 * 质量增益换算与 Pilling–Bedworth 适用性判定。
 */
import {
  massGainPerArea,
  assessParabolicApplicability,
  pillingBedworthRatio
} from '../../src/domain/film';

describe('质量增益 Δm/A = ρ·x', () => {
  test('100 µm、5000 kg/m³ -> 0.5 kg/m²', () => {
    expect(massGainPerArea(100, 5000)).toBeCloseTo(0.5, 12);
  });

  test('膜厚为零 -> 质量增益为零', () => {
    expect(massGainPerArea(0, 5000)).toBe(0);
  });

  test('膜厚加倍，质量增益加倍', () => {
    expect(massGainPerArea(40, 7000)).toBeCloseTo(2 * massGainPerArea(20, 7000), 12);
  });

  test('换算 g/cm²：0.5 kg/m² = 0.05 g/cm²', () => {
    // 在 service 层换算，这里核对基础量纲关系
    const kgM2 = massGainPerArea(100, 5000);
    expect(kgM2 * 0.1).toBeCloseTo(0.05, 12);
  });
});

describe('Pilling–Bedworth 判定', () => {
  test('PBR > 1 且致密 -> 抛物律适用', () => {
    const a = assessParabolicApplicability({ pillingBedworthRatio: 1.7, dense: true });
    expect(a.parabolicApplicable).toBe(true);
    expect(a.ratio).toBeCloseTo(1.7, 12);
  });

  test('PBR < 1 -> 不适用，如实标注原因', () => {
    const a = assessParabolicApplicability({ pillingBedworthRatio: 0.65, dense: true });
    expect(a.parabolicApplicable).toBe(false);
    expect(a.reason).toContain('≤ 1');
  });

  test('PBR > 1 但膜不致密 -> 不适用', () => {
    const a = assessParabolicApplicability({ pillingBedworthRatio: 1.7, dense: false });
    expect(a.parabolicApplicable).toBe(false);
    expect(a.reason).toContain('不致密');
  });

  test('PBR 过大（>2）压应力剥落风险 -> 不适用', () => {
    const a = assessParabolicApplicability({ pillingBedworthRatio: 2.5 });
    expect(a.parabolicApplicable).toBe(false);
  });

  test('信息不足 -> ratio=null，不擅自判定', () => {
    const a = assessParabolicApplicability({});
    expect(a.ratio).toBeNull();
    expect(a.parabolicApplicable).toBe(false);
  });

  test('反算 PBR：Al2O3/Al 随所用氧化物密度给出教材上的两种常见取值', () => {
    const base = {
      oxideMolarMass: 0.10196, // Al2O3 kg/mol
      metalMolesPerOxideMole: 2,
      metalMolarMass: 0.02698, // Al kg/mol
      metalDensity: 2700
    };
    // α-Al2O3 密度 3950 kg/m³（ASM/现代手册口径）-> PBR ≈ 1.29
    const pbrAlpha = pillingBedworthRatio({ ...base, oxideDensity: 3950 });
    expect(pbrAlpha).toBeCloseTo(1.29, 1);
    // 早期 Pilling–Bedworth 表按氧化膜有效密度约 3420 kg/m³ 计（多孔/亚稳相口径）-> PBR ≈ 1.49
    const pbrClassic = pillingBedworthRatio({ ...base, oxideDensity: 3424 });
    expect(pbrClassic).toBeCloseTo(1.49, 1);
    // 两种口径都 > 1，结论一致：Al 可形成保护性氧化膜
    expect(pbrAlpha).toBeGreaterThan(1);
    expect(pbrClassic).toBeGreaterThan(1);
  });
});
