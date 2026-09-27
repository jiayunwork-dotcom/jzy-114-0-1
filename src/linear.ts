import { ComputationError } from './errors';

/**
 * 线性增长律（界面反应控制）：x = k_l · t
 *
 * 膜厚本身与时间成正比：时间放大 4 倍 → 膜厚也放大 4 倍。
 * 与抛物律（x ∝ √t）是两条截然不同的增长律，本模块只实现线性律，
 * 两者在接口层也是两个独立入口，不叠加、不混用。
 *
 * @param rateConstant 线性速率常数 k_l，m/s（调用前须已校验为正数）
 * @param time 氧化时间 t，s（调用前须已校验为非负）
 * @returns 膜厚 x，m
 */
export function linearThickness(rateConstant: number, time: number): number {
  const thickness = rateConstant * time;
  if (!Number.isFinite(thickness)) {
    throw new ComputationError(
      `线性律计算得到非有限膜厚（k_l=${rateConstant}, t=${time}），请检查输入数量级`,
    );
  }
  return thickness;
}
