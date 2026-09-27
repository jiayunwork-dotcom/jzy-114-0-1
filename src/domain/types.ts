/**
 * 领域层公共类型定义。
 *
 * 单位约定（整套服务统一，不接受隐式单位换算）：
 * - 时间 t：小时 h
 * - 抛物速率常数 kp：长度²/时间，即 µm²/h（膜厚以 µm 给出时）
 * - 线性速率常数 kl：长度/时间，即 µm/h
 * - 温度 T、参考温度 T_ref：开尔文 K
 * - 激活能 Q：J/mol
 * - 气体常数 R：J/(mol·K)
 * - 氧分压 pO2、参考氧分压 pO2_ref：atm（比值无单位，atm/bar 对结果无影响）
 * - 密度 rho：kg/m³
 * - 膜厚 x：µm（质量增益换算时内部转 m）
 * - 单位面积质量增益 Δm/A：kg/m²
 */

/** Arrhenius 温度修正所需参数 */
export interface ArrheniusInput {
  /** 已给出的速率常数：默认视为参考温度 T_ref 下的值；不传 T_ref 时视为前指因子 A */
  kRef: number;
  /** 激活能 Q，J/mol */
  activationEnergy: number;
  /** 气体常数 R，J/(mol·K) */
  gasConstant: number;
  /** 目标温度，K */
  temperature: number;
  /** 参考温度，K；可缺省 */
  referenceTemperature?: number;
}

/** 氧分压指数修正所需参数 */
export interface OxygenPressureInput {
  /** 当前速率常数（分压 pO2_ref 下的已知值） */
  k: number;
  /** 实际氧分压 */
  pO2: number;
  /** 参考氧分压，即已知 k 对应的分压；缺省为 1 */
  pO2Ref?: number;
  /** 分压指数 n，由调用方按材料体系给定 */
  exponent: number;
}

/** Pilling–Bedworth 判定所需参数 */
export interface PbrInput {
  /** Pilling–Bedworth 比（氧化物/金属摩尔体积比）；可直接给出 */
  pillingBedworthRatio?: number;
  /** 氧化物摩尔质量，kg/mol（未直接给 PBR 时用于反算） */
  oxideMolarMass?: number;
  /** 每 mol 氧化物消耗的金属 mol 数（如 Al2O3 为 2） */
  metalMolesPerOxideMole?: number;
  /** 金属摩尔质量，kg/mol */
  metalMolarMass?: number;
  /** 氧化物密度，kg/m³ */
  oxideDensity?: number;
  /** 金属密度，kg/m³ */
  metalDensity?: number;
  /** 膜是否致密（裂纹/孔隙会使抛物律即使 PBR>1 也不成立）；缺省按致密处理 */
  dense?: boolean;
}

/** PBR 判定结果 */
export interface PbrAssessment {
  /** 参与判定的 PBR 值；信息不足无法反算时为 null */
  ratio: number | null;
  /** 抛物增长是否适用 */
  parabolicApplicable: boolean;
  /** 判定理由，如实返回 */
  reason: string;
}

/** 命名保存的材料参数组（字段全部可选，调用时再补临时字段） */
export interface MaterialParameterSet {
  name: string;
  description?: string;
  /** 抛物速率常数 kp，µm²/h */
  parabolicRateConstant?: number;
  /** 线性速率常数 kl，µm/h */
  linearRateConstant?: number;
  /** 激活能 Q，J/mol */
  activationEnergy?: number;
  /** 气体常数 R，J/(mol·K) */
  gasConstant?: number;
  /** 参考温度 T_ref，K */
  referenceTemperature?: number;
  /** 参考氧分压，atm */
  referenceOxygenPressure?: number;
  /** 氧分压指数 n */
  oxygenPressureExponent?: number;
  /** 材料密度（质量增益换算用），kg/m³ */
  density?: number;
  pillingBedworthRatio?: number;
  /** 氧化膜是否致密 */
  dense?: boolean;
  createdAt: string;
}

/** 温度修正段结果（回显给调用方核对） */
export interface TemperatureCorrection {
  applied: boolean;
  inputTemperatureK?: number;
  referenceTemperatureK?: number;
  activationEnergyJPerMol?: number;
  gasConstantJPerMolK?: number;
  /** 修正前速率常数 */
  kBefore?: number;
  /** Arrhenius 修正后、分压修正前的速率常数 */
  kAfterArrhenius?: number;
}

/** 分压修正段结果 */
export interface PressureCorrection {
  applied: boolean;
  pO2?: number;
  pO2Ref?: number;
  exponent?: number;
  kBefore?: number;
  kAfter?: number;
}
