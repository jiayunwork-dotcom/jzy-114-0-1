import { arrheniusCorrect } from './arrhenius';
import { applyOxygenPressure } from './oxygenPressure';
import type { ArrheniusInput, OxygenInput } from './types';

export interface RateConstantResolution {
  /** 修正前的速率常数 */
  base: number;
  /** 依次经 Arrhenius、氧分压修正后的有效速率常数 */
  effective: number;
  /** Arrhenius 修正倍率（未修正为 1） */
  arrheniusFactor: number;
  /** 氧分压修正倍率（未修正为 1） */
  oxygenFactor: number;
}

/**
 * 求有效速率常数：先 Arrhenius 温度修正，再乘氧分压因子。
 * 抛物律与线性律两个入口共用本函数，但各自只取自己的速率常数字段。
 */
export function resolveRateConstant(
  base: number,
  arrhenius?: ArrheniusInput,
  oxygen?: OxygenInput,
): RateConstantResolution {
  const afterArrhenius = arrhenius ? arrheniusCorrect(base, arrhenius) : base;
  const effective = oxygen ? applyOxygenPressure(afterArrhenius, oxygen) : afterArrhenius;
  return {
    base,
    effective,
    arrheniusFactor: afterArrhenius / base,
    oxygenFactor: effective / afterArrhenius,
  };
}
