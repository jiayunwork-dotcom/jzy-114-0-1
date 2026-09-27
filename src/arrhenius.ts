import { ComputationError } from './errors';
import type { ArrheniusInput } from './types';

/**
 * Arrhenius 温度修正，把速率常数修正到目标温度。
 *
 * 两种用法（由是否给出 referenceTemperature 决定）：
 * 1. 给出参考温度 T_ref：k(T) = k_ref · exp[-Q/R · (1/T - 1/T_ref)]
 *    输入速率常数视为 T_ref 下的实测值 k_ref；
 * 2. 未给参考温度：k(T) = A · exp(-Q/(R·T))
 *    输入速率常数视为指前因子 A。
 *
 * 两种形式下 k 都随温度升高而增大（Q > 0）。
 * 温度一律按开尔文处理；单位弄混（如把摄氏度当开尔文）会在校验层被拦截，
 * 这里再对结果做非有限兜底，绝不让 NaN/Infinity 流向下游。
 */
export function arrheniusCorrect(rateConstant: number, arrhenius: ArrheniusInput): number {
  const { activationEnergy: q, gasConstant: r, temperature: t, referenceTemperature: tRef } = arrhenius;
  const exponent =
    tRef !== undefined
      ? -(q / r) * (1 / t - 1 / tRef)
      : -(q / r) * (1 / t);
  const corrected = rateConstant * Math.exp(exponent);
  if (!Number.isFinite(corrected) || corrected <= 0) {
    throw new ComputationError(
      `Arrhenius 修正得到非法速率常数（指数项=${exponent}，k=${rateConstant}）：` +
        '请检查激活能、气体常数与温度（开尔文）是否匹配',
    );
  }
  return corrected;
}
