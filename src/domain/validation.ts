/**
 * 输入校验：所有"不讲道理的输入"都在数值计算开始之前被挡住，
 * 一律抛 ValidationError（带字段名与中文原因），不允许闷头算出 NaN/Infinity。
 */
import { ValidationError } from './errors';

export function requireNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ValidationError(`字段 ${field} 必须是数字，实际收到: ${String(value)}`, field);
  }
  return value;
}

export function requireFiniteNumber(value: unknown, field: string): number {
  const n = requireNumber(value, field);
  if (!Number.isFinite(n)) {
    throw new ValidationError(`字段 ${field} 必须是有限数值，实际收到: ${String(value)}`, field);
  }
  return n;
}

/** 可选字段：缺省 / null 视为未提供；提供则必须是有限数字 */
export function optionalFiniteNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  return requireFiniteNumber(value, field);
}

/** 氧化时间：允许 0（t=0 时膜厚必须为 0），不允许负值 */
export function validateTime(time: number): void {
  if (time < 0) {
    throw new ValidationError(`氧化时间不能为负值，实际收到: ${time} h`, 'time');
  }
}

/** 速率常数：必须为正数；为 0 时单独给出明确原因 */
export function validateRateConstant(k: number, field: string): void {
  if (k <= 0) {
    throw new ValidationError(
      `速率常数 ${field} 必须为正数（扩散/界面反应均不允许零或负的速率常数），实际收到: ${k}`,
      field
    );
  }
}

/**
 * 温度范围：本服务的领域是"高温氧化"，合理工况约 680 ℃ ~ 2000 ℃。
 * 下界刻意取 950 K：一是高温氧化（与普通大气锈蚀区分）的实际工况下界；
 * 二是把"把摄氏温度（如 900）当成开尔文传入"这类最常见的单位弄乱挡在
 * 计算之前——900 ℃ 应传 1173.15，误传 900 会得到偏小约两个数量级的
 * 离谱速率常数。
 */
const T_MIN_K = 950;
const T_MAX_K = 4000;

export function validateTemperature(temperature: number, field: string): void {
  if (temperature < T_MIN_K || temperature > T_MAX_K) {
    throw new ValidationError(
      `温度 ${field}=${temperature} K 超出高温氧化合理范围 [${T_MIN_K}, ${T_MAX_K}] K。` +
        `请确认使用的是开尔文（例：900 ℃ 应传 1173.15，而不是 900；700 ℃ 应传 973.15）`,
      field
    );
  }
}

export function validatePositive(value: number, field: string): void {
  if (value <= 0) {
    throw new ValidationError(`字段 ${field} 必须为正数，实际收到: ${value}`, field);
  }
}

/** 密度：质量增益换算需要，必须为正 */
export function validateDensity(density: number): void {
  validatePositive(density, 'density');
}

/** 氧分压：必须为正；> 数 atm 给出提示但不拒绝（高压氧化工况存在） */
export function validateOxygenPressure(p: number, field: string): void {
  if (p <= 0) {
    throw new ValidationError(`氧分压 ${field} 必须为正数，实际收到: ${p}`, field);
  }
}
