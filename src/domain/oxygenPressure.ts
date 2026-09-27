/**
 * 氧分压对速率常数的修正（指数关系，独立环节）。
 *
 *     k(pO2) = k_ref · ( pO2 / pO2_ref ) ^ n
 *
 * n 为分压指数，由调用方按材料体系给定（例如缺陷化学决定的 1/6、-1/4 等）。
 * 给定参考分压缺省为 1（atm/bar），即把已知 k 视作 1 atm 空气近似下的值。
 */
import { OxygenPressureInput } from './types';
import { ValidationError } from './errors';
import { validateOxygenPressure, validateRateConstant } from './validation';

export function oxygenPressureRateConstant(input: OxygenPressureInput): number {
  const { k, pO2, exponent } = input;
  const pO2Ref = input.pO2Ref ?? 1;

  validateRateConstant(k, 'rateConstant');
  validateOxygenPressure(pO2, 'pO2');
  validateOxygenPressure(pO2Ref, 'pO2Ref');

  if (typeof exponent !== 'number' || Number.isNaN(exponent) || !Number.isFinite(exponent)) {
    throw new ValidationError(
      `分压指数 exponent 必须是有限数值，实际收到: ${String(exponent)}`,
      'exponent'
    );
  }

  const ratio = pO2 / pO2Ref;
  const corrected = k * Math.pow(ratio, exponent);

  if (!Number.isFinite(corrected) || corrected <= 0) {
    throw new Error('氧分压修正后速率常数非正或非有限值，拒绝继续计算');
  }

  return corrected;
}
