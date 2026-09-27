/**
 * 请求模型解析（接口层）：把 HTTP 请求体 + 命名参数组合并成一次计算的入参。
 *
 * 合并规则：命名参数组提供缺省值，请求体内联字段一律覆盖（点名优先）。
 * 这里只做"取数/合并/基础类型校验"，不写任何氧化公式。
 */
import { MaterialParameterSet } from '../domain/types';
import { ValidationError } from '../domain/errors';
import {
  optionalFiniteNumber,
  requireFiniteNumber
} from '../domain/validation';
import { MaterialStore } from '../domain/materialStore';

/** 两条膜厚入口共用的入参（字段名对学生友好，同时接受 kp/kl 简写） */
export interface ThicknessRequest {
  time: number;
  rateConstant: number;
  activationEnergy?: number;
  gasConstant?: number;
  temperature?: number;
  referenceTemperature?: number;
  pO2?: number;
  pO2Ref?: number;
  oxygenPressureExponent?: number;
  density?: number;
  pillingBedworthRatio?: number;
  dense?: boolean;
  materialName?: string;
}

export function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError('请求体必须是 JSON 对象');
  }
  return body as Record<string, unknown>;
}

/** 命名组 + 内联字段合并；返回最终参与计算的入参快照 */
export function resolveThicknessRequest(
  body: Record<string, unknown>,
  store: MaterialStore,
  law: 'parabolic' | 'linear'
): ThicknessRequest {
  const named = resolveNamedSet(body, store);

  const rateField = law === 'parabolic' ? 'parabolicRateConstant' : 'linearRateConstant';
  const shortRateField = law === 'parabolic' ? 'kp' : 'kl';

  const inlineRate = optionalFiniteNumber(body[rateField] ?? body[shortRateField], rateField);
  const rateConstant = inlineRate ?? named?.[rateField];

  if (rateConstant === undefined) {
    throw new ValidationError(
      `缺少速率常数：请在请求体中提供 ${rateField}（或 ${shortRateField}），或引用已保存的材料参数组`,
      rateField
    );
  }

  const time = requireFiniteNumber(body.time, 'time');

  const denseRaw = body.dense ?? named?.dense;

  return {
    time,
    rateConstant,
    activationEnergy:
      optionalFiniteNumber(body.activationEnergy, 'activationEnergy') ?? named?.activationEnergy,
    gasConstant: optionalFiniteNumber(body.gasConstant, 'gasConstant') ?? named?.gasConstant,
    temperature: optionalFiniteNumber(body.temperature, 'temperature'),
    referenceTemperature:
      optionalFiniteNumber(body.referenceTemperature, 'referenceTemperature') ??
      named?.referenceTemperature,
    pO2: optionalFiniteNumber(body.pO2, 'pO2') ?? undefined,
    pO2Ref:
      optionalFiniteNumber(body.pO2Ref, 'pO2Ref') ?? named?.referenceOxygenPressure,
    oxygenPressureExponent:
      optionalFiniteNumber(body.oxygenPressureExponent, 'oxygenPressureExponent') ??
      named?.oxygenPressureExponent,
    density: optionalFiniteNumber(body.density, 'density') ?? named?.density,
    pillingBedworthRatio:
      optionalFiniteNumber(body.pillingBedworthRatio, 'pillingBedworthRatio') ??
      named?.pillingBedworthRatio,
    dense: typeof denseRaw === 'boolean' ? denseRaw : undefined,
    materialName: typeof body.material === 'string' ? body.material : named?.name
  };
}

function resolveNamedSet(
  body: Record<string, unknown>,
  store: MaterialStore
): MaterialParameterSet | undefined {
  const materialName = body.material;
  if (materialName === undefined || materialName === null) return undefined;
  if (typeof materialName !== 'string') {
    throw new ValidationError('material 必须是已保存参数组的名称字符串', 'material');
  }
  const found = store.get(materialName);
  if (!found) {
    throw new ValidationError(`未找到名为 "${materialName}" 的材料参数组`, 'material');
  }
  return found;
}
