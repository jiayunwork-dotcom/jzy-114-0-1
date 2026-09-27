/**
 * 线性律膜厚求解（与抛物律完全分开的另一条增长律）。
 *
 * 物理模型：界面反应控制增长，膜厚本身随时间线性增长
 *
 *     x = kl · t
 *
 * 单位：kl [µm/h]，t [h]，返回膜厚 x [µm]。
 *
 * 注意：本文件不得与抛物公式混用或叠加；调用方点名走哪条入口就只走哪条。
 * t = 0 => x = 0；t 变为 4 倍 => x 也变为 4 倍（与抛物律的 2 倍形成对照，
 * 正是回归测试区分两条增长律的依据）。
 */
import { validateRateConstant, validateTime } from './validation';

export interface LinearResult {
  /** 膜厚，µm */
  thickness: number;
  /** 实际使用的线性速率常数，µm/h */
  rateConstant: number;
  /** 氧化时间，h */
  time: number;
  law: 'linear';
}

export function linearThickness(
  kl: number,
  time: number,
  effectiveKl: number = kl
): LinearResult {
  validateTime(time);
  validateRateConstant(effectiveKl, 'linearRateConstant');

  const thickness = effectiveKl * time;

  return {
    thickness,
    rateConstant: effectiveKl,
    time,
    law: 'linear'
  };
}
