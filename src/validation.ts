import { ValidationError } from './errors';
import type { ArrheniusInput, MaterialParams, OxygenInput, PbrInput } from './types';

/**
 * 输入校验：所有"不讲道理的输入"在进入任何计算之前被拦下，
 * 抛 ValidationError（HTTP 400），消息里交代原因。
 */

/** 高温氧化核算的温度合理区间（开尔文）。低于 0 °C 对本服务无意义，
 *  且摄氏/开尔文弄混（如把 25 °C 写成 25）会落在此区间之外被拦下。 */
export const MIN_TEMPERATURE_K = 273.15;
export const MAX_TEMPERATURE_K = 6000;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function requireFiniteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(
      `字段 ${field} 必须是有限数值，收到: ${JSON.stringify(value) ?? String(value)}`,
    );
  }
  return value;
}

export function requirePositiveNumber(value: unknown, field: string): number {
  const n = requireFiniteNumber(value, field);
  if (n <= 0) {
    throw new ValidationError(`字段 ${field} 必须是正数，收到: ${n}`);
  }
  return n;
}

export function requireNonNegativeNumber(value: unknown, field: string): number {
  const n = requireFiniteNumber(value, field);
  if (n < 0) {
    throw new ValidationError(`字段 ${field} 不能为负值，收到: ${n}`);
  }
  return n;
}

/** 温度必须是开尔文且落在合理区间，防止单位弄混算出离谱结果 */
export function requireTemperatureKelvin(value: unknown, field: string): number {
  const t = requireFiniteNumber(value, field);
  if (t < MIN_TEMPERATURE_K || t > MAX_TEMPERATURE_K) {
    throw new ValidationError(
      `字段 ${field}=${t} 超出合理温度范围 [${MIN_TEMPERATURE_K}, ${MAX_TEMPERATURE_K}] K：` +
        '本服务按开尔文处理温度，若原始数据是摄氏温度请先加 273.15 换算，' +
        '单位弄混会让 Arrhenius 修正算出离谱的速率常数',
    );
  }
  return t;
}

export function parseArrhenius(raw: unknown): ArrheniusInput | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    throw new ValidationError('字段 arrhenius 必须是对象 {activationEnergy, gasConstant, temperature, referenceTemperature?}');
  }
  const result: ArrheniusInput = {
    activationEnergy: requirePositiveNumber(raw.activationEnergy, 'arrhenius.activationEnergy (J/mol)'),
    gasConstant: requirePositiveNumber(raw.gasConstant, 'arrhenius.gasConstant (J/(mol·K))'),
    temperature: requireTemperatureKelvin(raw.temperature, 'arrhenius.temperature'),
  };
  if (raw.referenceTemperature !== undefined) {
    result.referenceTemperature = requireTemperatureKelvin(
      raw.referenceTemperature,
      'arrhenius.referenceTemperature',
    );
  }
  return result;
}

export function parseOxygen(raw: unknown): OxygenInput | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    throw new ValidationError('字段 oxygen 必须是对象 {partialPressure, exponent}');
  }
  return {
    partialPressure: requirePositiveNumber(raw.partialPressure, 'oxygen.partialPressure'),
    exponent: requireFiniteNumber(raw.exponent, 'oxygen.exponent'),
  };
}

export function parsePbr(raw: unknown): PbrInput | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    throw new ValidationError(
      '字段 pillingBedworth 必须是对象 {metalMolarMass, metalDensity, oxideMolarMass, oxideDensity, metalAtomsPerOxideUnit}',
    );
  }
  return {
    metalMolarMass: requirePositiveNumber(raw.metalMolarMass, 'pillingBedworth.metalMolarMass (g/mol)'),
    metalDensity: requirePositiveNumber(raw.metalDensity, 'pillingBedworth.metalDensity (kg/m^3)'),
    oxideMolarMass: requirePositiveNumber(raw.oxideMolarMass, 'pillingBedworth.oxideMolarMass (g/mol)'),
    oxideDensity: requirePositiveNumber(raw.oxideDensity, 'pillingBedworth.oxideDensity (kg/m^3)'),
    metalAtomsPerOxideUnit: requirePositiveNumber(
      raw.metalAtomsPerOxideUnit,
      'pillingBedworth.metalAtomsPerOxideUnit',
    ),
  };
}

/** 校验命名材料参数组：所有字段可选，但至少要给出一个有效字段 */
export function parseMaterialParams(raw: Record<string, unknown>): MaterialParams {
  const params: MaterialParams = {};
  if (raw.rateConstant !== undefined) {
    params.rateConstant = requirePositiveNumber(raw.rateConstant, 'rateConstant (m^2/s)');
  }
  if (raw.linearRateConstant !== undefined) {
    params.linearRateConstant = requirePositiveNumber(raw.linearRateConstant, 'linearRateConstant (m/s)');
  }
  if (raw.density !== undefined) {
    params.density = requirePositiveNumber(raw.density, 'density (kg/m^3)');
  }
  const arrhenius = parseArrhenius(raw.arrhenius);
  if (arrhenius) params.arrhenius = arrhenius;
  const oxygen = parseOxygen(raw.oxygen);
  if (oxygen) params.oxygen = oxygen;
  const pbr = parsePbr(raw.pillingBedworth);
  if (pbr) params.pillingBedworth = pbr;
  if (Object.keys(params).length === 0) {
    throw new ValidationError(
      '材料参数组至少要包含一个字段：rateConstant / linearRateConstant / density / arrhenius / oxygen / pillingBedworth',
    );
  }
  return params;
}
