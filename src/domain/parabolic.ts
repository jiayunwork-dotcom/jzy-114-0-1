/**
 * 抛物律膜厚求解（本服务主角）。
 *
 * 物理模型：扩散控制增长，膜厚平方随时间线性增长
 *
 *     x² = kp · t        =>        x = sqrt(kp · t)
 *
 * 单位：kp [µm²/h]，t [h]，返回膜厚 x [µm]。
 *
 * 关键性质（由测试钉死）：
 *   - t 变为 4 倍、kp 不变 => x 恰好变为 2 倍
 *   - kp 变为 2 倍、t 不变 => x 变为 √2 倍
 *   - t = 0 => x = 0
 * 切勿把本入口写成 x = k·t（那是线性律，见 linear.ts）。
 */
import { validateRateConstant, validateTime } from './validation';

export interface ParabolicResult {
  /** 膜厚，µm */
  thickness: number;
  /** 实际使用的抛物速率常数，µm²/h */
  rateConstant: number;
  /** 氧化时间，h */
  time: number;
  law: 'parabolic';
}

export function parabolicThickness(
  kp: number,
  time: number,
  /** 调用方完成温度/分压修正后的有效 kp；此处仍对最终落算的值做一次防御性校验 */
  effectiveKp: number = kp
): ParabolicResult {
  validateTime(time);
  validateRateConstant(effectiveKp, 'parabolicRateConstant');

  const thickness = Math.sqrt(effectiveKp * time);

  return {
    thickness,
    rateConstant: effectiveKp,
    time,
    law: 'parabolic'
  };
}
