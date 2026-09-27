/**
 * 共享类型定义。单位约定（SI）：
 * - 抛物速率常数 rateConstant: m^2/s（x^2 = k·t）
 * - 线性速率常数 linearRateConstant: m/s（x = k·t）
 * - 时间 time: s；膜厚 thickness: m；密度 density: kg/m^3；质量增益 massGain: kg/m^2
 * - 温度: K；激活能: J/mol；气体常数: J/(mol·K)
 * - 摩尔质量: g/mol（PBR 计算中比值无量纲，分子分母一致即可）
 */

/** Arrhenius 温度修正参数 */
export interface ArrheniusInput {
  /** 激活能 Q，J/mol */
  activationEnergy: number;
  /** 气体常数 R，J/(mol·K) */
  gasConstant: number;
  /** 目标温度 T，K */
  temperature: number;
  /**
   * 参考温度 T_ref，K（可选）。
   * 给出时：k(T) = k_ref · exp[-Q/R · (1/T - 1/T_ref)]，输入速率常数视为 T_ref 下的实测值；
   * 缺省时：k(T) = A · exp(-Q/(R·T))，输入速率常数视为指前因子 A。
   */
  referenceTemperature?: number;
}

/** 氧分压修正参数：k_eff = k · (pO2)^n */
export interface OxygenInput {
  /** 氧分压 pO2（与标定 k 时所用单位一致，通常 atm） */
  partialPressure: number;
  /** 分压指数 n，由调用方给定 */
  exponent: number;
}

/** Pilling–Bedworth 比计算所需参数 */
export interface PbrInput {
  /** 金属摩尔质量，g/mol */
  metalMolarMass: number;
  /** 金属密度，kg/m^3 */
  metalDensity: number;
  /** 氧化物摩尔质量，g/mol */
  oxideMolarMass: number;
  /** 氧化物密度，kg/m^3 */
  oxideDensity: number;
  /** 每个氧化物化学式单元中的金属原子数 n（如 Fe2O3 为 2） */
  metalAtomsPerOxideUnit: number;
}

/** 可命名保存的材料参数组（所有字段可选，但至少要给一个） */
export interface MaterialParams {
  /** 抛物速率常数 k_p，m^2/s */
  rateConstant?: number;
  /** 线性速率常数 k_l，m/s */
  linearRateConstant?: number;
  /** 氧化物密度，kg/m^3（用于质量增益换算） */
  density?: number;
  arrhenius?: ArrheniusInput;
  oxygen?: OxygenInput;
  pillingBedworth?: PbrInput;
}
