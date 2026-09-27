import { ComputationError } from './errors';
import type { OxygenInput } from './types';

/**
 * 速率常数对氧分压的依赖（指数关系）：k_eff = k · (pO2)^n
 * 分压指数 n 由调用方给定（可为负，视材料体系而定）。
 */
export function applyOxygenPressure(rateConstant: number, oxygen: OxygenInput): number {
  const corrected = rateConstant * Math.pow(oxygen.partialPressure, oxygen.exponent);
  if (!Number.isFinite(corrected) || corrected <= 0) {
    throw new ComputationError(
      `氧分压修正得到非法速率常数（pO2=${oxygen.partialPressure}, n=${oxygen.exponent}）`,
    );
  }
  return corrected;
}
