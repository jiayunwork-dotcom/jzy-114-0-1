/**
 * 膜厚 -> 单位面积质量增益，以及 Pilling–Bedworth 抛物律适用性判定。
 */
import { PbrAssessment, PbrInput } from './types';
import { ValidationError } from './errors';
import { validateDensity } from './validation';

const UM_PER_M = 1e6;

/**
 * 由膜厚与材料密度换算单位面积质量增益：
 *
 *     Δm/A = ρ · x
 *
 * 教学口径：把氧化膜近似为给定密度 ρ 的致密薄膜，质量/面积 = 密度 × 膜厚。
 * 厚度 µm 内部换算为 m（1 µm = 1e-6 m），ρ [kg/m³]，返回 kg/m²。
 *
 * 说明：热重（TGA）实测的"单位面积增重"指进入试样的氧质量；本接口按题意
 * 以膜层整体质量（ρ·x）给出，两者差一个氧化物氧质量分数，文档中已注明。
 */
export function massGainPerArea(thicknessUm: number, densityKgM3: number): number {
  if (thicknessUm < 0) {
    throw new ValidationError(`膜厚不能为负值，实际收到: ${thicknessUm} µm`, 'thickness');
  }
  validateDensity(densityKgM3);

  const thicknessM = thicknessUm / UM_PER_M;
  return densityKgM3 * thicknessM;
}

/**
 * Pilling–Bedworth 比：
 *
 *     PBR = V_oxide / V_metal_consumed
 *         = (M_oxide / ρ_oxide) / ( ν · M_metal / ρ_metal )
 *
 * 其中 ν = 每 mol 氧化物消耗的金属 mol 数（Al2O3 取 2，FeO 取 1）。
 * 直接给了 pillingBedworthRatio 就用它；否则信息齐全时反算。
 */
export function pillingBedworthRatio(input: PbrInput): number | null {
  if (
    typeof input.pillingBedworthRatio === 'number' &&
    Number.isFinite(input.pillingBedworthRatio)
  ) {
    if (input.pillingBedworthRatio <= 0) {
      throw new ValidationError(
        `Pilling–Bedworth 比必须为正数，实际收到: ${input.pillingBedworthRatio}`,
        'pillingBedworthRatio'
      );
    }
    return input.pillingBedworthRatio;
  }

  const {
    oxideMolarMass,
    metalMolesPerOxideMole,
    metalMolarMass,
    oxideDensity,
    metalDensity
  } = input;

  const params = [
    oxideMolarMass,
    metalMolesPerOxideMole,
    metalMolarMass,
    oxideDensity,
    metalDensity
  ];
  if (params.some((v) => v === undefined)) {
    return null;
  }
  if (params.some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
    throw new ValidationError('反算 PBR 的参数必须全部为有限数值', 'pillingBedworthRatio');
  }

  if (metalMolesPerOxideMole! <= 0) {
    throw new ValidationError(
      `每 mol 氧化物消耗的金属 mol 数必须为正，实际收到: ${metalMolesPerOxideMole}`,
      'metalMolesPerOxideMole'
    );
  }
  if (oxideDensity! <= 0 || metalDensity! <= 0) {
    throw new ValidationError('反算 PBR 时氧化物与金属密度必须为正', 'oxideDensity');
  }

  const molarVolumeOxide = oxideMolarMass! / oxideDensity!;
  const molarVolumeMetalConsumed = (metalMolesPerOxideMole! * metalMolarMass!) / metalDensity!;
  const ratio = molarVolumeOxide / molarVolumeMetalConsumed;

  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new ValidationError('PBR 反算结果异常，请核对摩尔质量与密度的单位', 'pillingBedworthRatio');
  }
  return ratio;
}

/**
 * 抛物律适用性判定，如实标注：
 * - PBR > 1 且膜致密  -> 体积足以覆盖金属表面，可形成保护性膜，抛物（扩散控制）增长适用；
 * - PBR < 1           -> 氧化物体积不足，膜受拉、多孔开裂，难以维持扩散控制的抛物增长；
 * - PBR 明显过大（>2）-> 压应力过高，膜易起皱剥落，抛物增长通常也难维持；
 * - 信息不足          -> 不擅自判定，标 unknown。
 */
export function assessParabolicApplicability(input: PbrInput): PbrAssessment {
  const dense = input.dense ?? true;
  const ratio = pillingBedworthRatio(input);

  if (ratio === null) {
    return {
      ratio: null,
      parabolicApplicable: false,
      reason:
        '未提供 Pilling–Bedworth 比或反算所需的全部摩尔质量/密度参数，无法判定抛物律适用性'
    };
  }

  if (ratio <= 1) {
    return {
      ratio,
      parabolicApplicable: false,
      reason: `PBR=${ratio.toFixed(3)} ≤ 1：氧化物体积不足以完整覆盖金属表面，膜易开裂，抛物（扩散控制）增长不适用`
    };
  }

  if (!dense) {
    return {
      ratio,
      parabolicApplicable: false,
      reason: `PBR=${ratio.toFixed(3)} > 1，但膜不致密（多孔/开裂），扩散屏障不成立，抛物增长不适用`
    };
  }

  if (ratio > 2) {
    return {
      ratio,
      parabolicApplicable: false,
      reason: `PBR=${ratio.toFixed(3)} > 2：压应力过高，膜易起皱剥落，通常无法维持稳定的抛物增长`
    };
  }

  return {
    ratio,
    parabolicApplicable: true,
    reason: `PBR=${ratio.toFixed(3)} > 1 且膜致密，可形成保护性膜，抛物（扩散控制）增长适用`
  };
}
