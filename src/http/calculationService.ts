/**
 * 计算编排（接口层与公式层之间）：驱动"修正速率常数 -> 对应增长律入口 ->
 * 质量增益/PBR 判定"。不重新实现任何公式，只负责顺序与组装返回。
 */
import { parabolicThickness } from '../domain/parabolic';
import { linearThickness } from '../domain/linear';
import { massGainPerArea, assessParabolicApplicability } from '../domain/film';
import { resolveEffectiveRate } from '../domain/kinetics';
import {
  PressureCorrection,
  TemperatureCorrection,
  PbrAssessment
} from '../domain/types';
import { ThicknessRequest } from './requestModel';

export interface ThicknessResponse {
  law: 'parabolic' | 'linear';
  material?: string;
  timeH: number;
  thicknessUm: number;
  effectiveRateConstant: number;
  temperatureCorrection: TemperatureCorrection;
  pressureCorrection: PressureCorrection;
  massGain?: {
    densityKgM3: number;
    massGainPerAreaKgM2: number;
    massGainPerAreaGcm2: number;
  };
  parabolicApplicability?: PbrAssessment;
}

function buildResponse(
  law: 'parabolic' | 'linear',
  req: ThicknessRequest,
  effectiveK: number,
  thicknessUm: number
): ThicknessResponse {
  const res: ThicknessResponse = {
    law,
    material: req.materialName,
    timeH: req.time,
    thicknessUm,
    effectiveRateConstant: effectiveK,
    temperatureCorrection: { applied: false },
    pressureCorrection: { applied: false }
  };

  if (req.density !== undefined) {
    const kgM2 = massGainPerArea(thicknessUm, req.density);
    res.massGain = {
      densityKgM3: req.density,
      massGainPerAreaKgM2: kgM2,
      // kg/m² -> g/cm²：×1000 / 1e4 = ×0.1
      massGainPerAreaGcm2: kgM2 * 0.1
    };
  }

  // PBR 判定只对抛物入口有意义；线性入口不返回（避免误导）
  if (law === 'parabolic' && (req.pillingBedworthRatio !== undefined || req.dense !== undefined)) {
    res.parabolicApplicability = assessParabolicApplicability({
      pillingBedworthRatio: req.pillingBedworthRatio,
      dense: req.dense
    });
  }

  return res;
}

export function runParabolic(req: ThicknessRequest): ThicknessResponse {
  const resolved = resolveEffectiveRate({
    k: req.rateConstant,
    activationEnergy: req.activationEnergy,
    gasConstant: req.gasConstant,
    temperature: req.temperature,
    referenceTemperature: req.referenceTemperature,
    pO2: req.pO2,
    pO2Ref: req.pO2Ref,
    oxygenPressureExponent: req.oxygenPressureExponent
  });

  const result = parabolicThickness(req.rateConstant, req.time, resolved.k);
  const response = buildResponse('parabolic', req, resolved.k, result.thickness);
  response.temperatureCorrection = resolved.temperatureCorrection;
  response.pressureCorrection = resolved.pressureCorrection;
  return response;
}

export function runLinear(req: ThicknessRequest): ThicknessResponse {
  const resolved = resolveEffectiveRate({
    k: req.rateConstant,
    activationEnergy: req.activationEnergy,
    gasConstant: req.gasConstant,
    temperature: req.temperature,
    referenceTemperature: req.referenceTemperature,
    pO2: req.pO2,
    pO2Ref: req.pO2Ref,
    oxygenPressureExponent: req.oxygenPressureExponent
  });

  const result = linearThickness(req.rateConstant, req.time, resolved.k);
  const response = buildResponse('linear', req, resolved.k, result.thickness);
  response.temperatureCorrection = resolved.temperatureCorrection;
  response.pressureCorrection = resolved.pressureCorrection;
  return response;
}

export interface MassGainRequest {
  thickness: number;
  density: number;
}

export function runMassGain(req: MassGainRequest): {
  thicknessUm: number;
  densityKgM3: number;
  massGainPerAreaKgM2: number;
  massGainPerAreaGcm2: number;
} {
  const kgM2 = massGainPerArea(req.thickness, req.density);
  return {
    thicknessUm: req.thickness,
    densityKgM3: req.density,
    massGainPerAreaKgM2: kgM2,
    massGainPerAreaGcm2: kgM2 * 0.1
  };
}
