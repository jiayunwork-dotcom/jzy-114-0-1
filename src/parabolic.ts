import { ComputationError } from './errors';

/**
 * 抛物增长律（扩散控制）：x^2 = k_p · t  →  x = sqrt(k_p · t)
 *
 * 膜厚的平方与时间成正比，因此：
 * - 时间放大 4 倍 → 膜厚恰好翻 1 倍（x ∝ √t）；
 * - 速率常数翻 1 倍 → 膜厚按 √2 倍增大。
 * 注意切勿写成 x ∝ t（那是线性律），否则时间 4 倍会错误地给出膜厚 4 倍。
 *
 * @param rateConstant 抛物速率常数 k_p，m^2/s（调用前须已校验为正数）
 * @param time 氧化时间 t，s（调用前须已校验为非负）
 * @returns 膜厚 x，m
 */
export function parabolicThickness(rateConstant: number, time: number): number {
  const thickness = Math.sqrt(rateConstant * time);
  if (!Number.isFinite(thickness)) {
    throw new ComputationError(
      `抛物律计算得到非有限膜厚（k_p=${rateConstant}, t=${time}），请检查输入数量级`,
    );
  }
  return thickness;
}
