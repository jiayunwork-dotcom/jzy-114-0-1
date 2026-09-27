/**
 * Arrhenius 温度修正（独立环节）。
 *
 *     k(T) = A · exp( -Q / (R T) )
 *
 * 若已知参考温度 T_ref 下的速率常数 k_ref（典型用法），则
 *
 *     k(T) = k_ref · exp[ -(Q/R) · (1/T - 1/T_ref) ]
 *
 * 不传 T_ref 时，把 k_ref 直接当前指因子 A 使用。
 *
 * 单位：Q [J/mol]，R [J/(mol·K)]，T、T_ref [K]，返回 k(T)，单位与 k_ref 相同。
 * 高温氧化语境下 Q 通常为 1e5 ~ 5e5 J/mol；R 取 8.314 J/(mol·K)。
 */
import { ArrheniusInput } from './types';
import { ValidationError } from './errors';
import {
  validatePositive,
  validateRateConstant,
  validateTemperature
} from './validation';

export function arrheniusRateConstant(input: ArrheniusInput): number {
  const { kRef, activationEnergy, gasConstant, temperature } = input;
  const referenceTemperature = input.referenceTemperature;

  validateRateConstant(kRef, 'rateConstant');
  validatePositive(activationEnergy, 'activationEnergy');
  validatePositive(gasConstant, 'gasConstant');
  validateTemperature(temperature, 'temperature');

  const qOverR = activationEnergy / gasConstant;

  let exponent: number;
  if (referenceTemperature !== undefined) {
    validateTemperature(referenceTemperature, 'referenceTemperature');
    exponent = -qOverR * (1 / temperature - 1 / referenceTemperature);
  } else {
    exponent = -qOverR / temperature;
  }

  // 挡住单位弄乱导致的指数爆炸（如 Q 用了 cal 而 R 用了 8.314）
  if (!Number.isFinite(exponent) || exponent > 200 || exponent < -200) {
    throw new ValidationError(
      `Arrhenius 指数量级异常（${exponent}），请核对 Q/R/T 的单位一致性：` +
        'Q 应使用 J/mol，R 使用 J/(mol·K)，温度使用 K',
      'activationEnergy'
    );
  }

  const k = kRef * Math.exp(exponent);

  if (!Number.isFinite(k) || k <= 0) {
    throw new ValidationError(
      'Arrhenius 修正后速率常数非正或非有限值，请核对温度与活化能单位（K 与 J/mol）',
      'temperature'
    );
  }

  return k;
}
