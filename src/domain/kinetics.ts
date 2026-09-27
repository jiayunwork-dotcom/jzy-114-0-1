/**
 * 速率常数解析管线：在进入膜厚公式之前，依次施加
 *   1. Arrhenius 温度修正（可选）
 *   2. 氧分压指数修正（可选）
 *
 * 接口层只负责取参数，本文件负责"修正顺序"这一条领域规则。
 */
import { ArrheniusInput, PressureCorrection, TemperatureCorrection } from './types';
import { ValidationError } from './errors';
import { arrheniusRateConstant } from './arrhenius';
import { oxygenPressureRateConstant } from './oxygenPressure';

export interface RateCorrectionOptions {
  k: number;
  /** 温度修正三件套；三者齐全才施加 */
  activationEnergy?: number;
  gasConstant?: number;
  temperature?: number;
  referenceTemperature?: number;
  /** 分压修正；pO2 与 exponent 齐全才施加 */
  pO2?: number;
  pO2Ref?: number;
  oxygenPressureExponent?: number;
}

export interface ResolvedRate {
  k: number;
  temperatureCorrection: TemperatureCorrection;
  pressureCorrection: PressureCorrection;
}

export function resolveEffectiveRate(options: RateCorrectionOptions): ResolvedRate {
  let k = options.k;

  // ---- 1. Arrhenius 温度修正 ----
  // 触发条件：本次请求给了目标温度。命名组里可只存 Q/R/Tref 供反复调用，
  // 不提供目标温度的请求按参考温度下的 k 直接计算，不做半截子修正。
  const wantTempCorrection = options.temperature !== undefined;

  let temperatureCorrection: TemperatureCorrection = { applied: false };

  if (wantTempCorrection) {
    // 要做温度修正就必须把三件套给齐（Q/R 可由命名组提供），避免静默跳过
    const missing: string[] = [];
    if (options.activationEnergy === undefined) missing.push('activationEnergy');
    if (options.gasConstant === undefined) missing.push('gasConstant');
    if (missing.length > 0) {
      throw new ValidationError(
        `温度修正需要同时提供 activationEnergy、gasConstant（目标温度 temperature=${options.temperature} K 已给出），缺少: ${missing.join(', ')}`,
        missing[0]
      );
    }

    const arrheniusInput: ArrheniusInput = {
      kRef: k,
      activationEnergy: options.activationEnergy!,
      gasConstant: options.gasConstant!,
      temperature: options.temperature!,
      referenceTemperature: options.referenceTemperature
    };

    const kBefore = k;
    k = arrheniusRateConstant(arrheniusInput);
    temperatureCorrection = {
      applied: true,
      inputTemperatureK: options.temperature,
      referenceTemperatureK: options.referenceTemperature,
      activationEnergyJPerMol: options.activationEnergy,
      gasConstantJPerMolK: options.gasConstant,
      kBefore,
      kAfterArrhenius: k
    };
  }

  // ---- 2. 氧分压指数修正 ----
  const wantPressureCorrection =
    options.pO2 !== undefined || options.oxygenPressureExponent !== undefined;

  let pressureCorrection: PressureCorrection = { applied: false };

  if (wantPressureCorrection) {
    if (options.pO2 === undefined || options.oxygenPressureExponent === undefined) {
      throw new ValidationError(
        '分压修正需要同时提供 pO2 与 oxygenPressureExponent',
        'pO2'
      );
    }

    const kBefore = k;
    k = oxygenPressureRateConstant({
      k,
      pO2: options.pO2,
      pO2Ref: options.pO2Ref,
      exponent: options.oxygenPressureExponent
    });
    pressureCorrection = {
      applied: true,
      pO2: options.pO2,
      pO2Ref: options.pO2Ref ?? 1,
      exponent: options.oxygenPressureExponent,
      kBefore,
      kAfter: k
    };
  }

  return { k, temperatureCorrection, pressureCorrection };
}
