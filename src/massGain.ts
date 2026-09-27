import { ComputationError } from './errors';
import type { PbrInput } from './types';

/**
 * 由膜厚换算单位面积质量增益：Δm/A = x · ρ_oxide
 * （按氧化物密度近似，即把膜质量全部折算为氧化物质量。）
 *
 * @param thickness 膜厚 x，m
 * @param density 氧化物密度，kg/m^3
 * @returns 单位面积质量增益，kg/m^2
 */
export function massGainPerArea(thickness: number, density: number): number {
  const gain = thickness * density;
  if (!Number.isFinite(gain)) {
    throw new ComputationError(
      `质量增益换算得到非有限结果（x=${thickness}, ρ=${density}）`,
    );
  }
  return gain;
}

/**
 * Pilling–Bedworth 比：PBR = V_oxide / V_metal
 *   = (M_oxide / ρ_oxide) / (n · M_metal / ρ_metal)
 * 即 1 mol 氧化物所占体积与生成它所需金属的体积之比（无量纲）。
 */
export function pillingBedworthRatio(input: PbrInput): number {
  const oxideMolarVolume = input.oxideMolarMass / input.oxideDensity;
  const metalMolarVolume =
    (input.metalAtomsPerOxideUnit * input.metalMolarMass) / input.metalDensity;
  const ratio = oxideMolarVolume / metalMolarVolume;
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new ComputationError(`Pilling–Bedworth 比计算得到非法值（${ratio}）`);
  }
  return ratio;
}

export interface PbrAssessment {
  ratio: number;
  /** PBR > 1（膜足够致密、能覆盖金属表面）时才认为适用抛物增长律 */
  parabolicApplicable: boolean;
  note: string;
}

/**
 * 依据 PBR 判定抛物律适用性：
 * - PBR ≤ 1：氧化物体积不足以覆盖金属，膜多孔不保护 → 不适用抛物律（更接近线性律）；
 * - 1 < PBR ≤ 2：膜致密且应力适中，具保护性 → 适用抛物律；
 * - PBR > 2：膜内压应力大，可能开裂剥落 → 标记适用但附 caution，致密性需另行确认。
 */
export function assessParabolicApplicability(ratio: number): PbrAssessment {
  const parabolicApplicable = ratio > 1;
  let note: string;
  if (ratio <= 1) {
    note =
      'PBR ≤ 1：氧化物体积不足以覆盖金属表面，膜倾向多孔、不具保护性，' +
      '抛物律不适用（增长更可能受界面反应控制，呈线性律）';
  } else if (ratio <= 2) {
    note = '1 < PBR ≤ 2：氧化膜致密且应力适中，具保护性，适用抛物增长律';
  } else {
    note =
      'PBR > 2：膜内压应力较大，可能开裂、剥落，抛物律适用性需谨慎，' +
      '膜的致密性应另行确认';
  }
  return { ratio, parabolicApplicable, note };
}
