import express, {
  type Express,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { ComputationError, NotFoundError, ValidationError } from './errors';
import { parabolicThickness } from './parabolic';
import { linearThickness } from './linear';
import { resolveRateConstant } from './rateConstant';
import {
  assessParabolicApplicability,
  massGainPerArea,
  pillingBedworthRatio,
} from './massGain';
import { deleteMaterial, getMaterial, listMaterials, saveMaterial } from './materials';
import {
  isRecord,
  parseArrhenius,
  parseMaterialParams,
  parseOxygen,
  parsePbr,
  requireNonNegativeNumber,
  requirePositiveNumber,
} from './validation';

type Law = 'parabolic' | 'linear';

/** 请求体里引用了命名参数组时，以存储值为默认、请求内显式字段覆盖 */
function mergeWithMaterial(body: Record<string, unknown>): Record<string, unknown> {
  if (body.material === undefined) return body;
  if (typeof body.material !== 'string' || body.material.trim() === '') {
    throw new ValidationError('字段 material 必须是非空字符串（已保存材料参数组的名字）');
  }
  const stored = getMaterial(body.material.trim());
  if (!stored) {
    throw new NotFoundError(`未找到名为 "${body.material}" 的材料参数组`);
  }
  const overrides = Object.fromEntries(
    Object.entries(body).filter(([key, value]) => key !== 'material' && value !== undefined),
  );
  return { ...stored, ...overrides };
}

/**
 * 膜厚入口（抛物律 / 线性律各一个，公式互不混用）：
 * 解析请求 → 校验 → 求有效速率常数 → 走对应增长律 → 可选质量增益 / PBR。
 */
function thicknessHandler(law: Law): RequestHandler {
  return (req: Request, res: Response) => {
    if (!isRecord(req.body)) {
      throw new ValidationError('请求体必须是 JSON 对象');
    }
    const body = mergeWithMaterial(req.body);

    const time = requireNonNegativeNumber(body.time, 'time (s)');
    const kField = law === 'parabolic' ? 'rateConstant' : 'linearRateConstant';
    const kDesc =
      law === 'parabolic'
        ? 'rateConstant（抛物速率常数 k_p，m^2/s）'
        : 'linearRateConstant（线性速率常数 k_l，m/s）';
    const baseK = requirePositiveNumber(body[kField], kDesc);

    const arrhenius = parseArrhenius(body.arrhenius);
    const oxygen = parseOxygen(body.oxygen);
    const density =
      body.density === undefined ? undefined : requirePositiveNumber(body.density, 'density (kg/m^3)');
    // PBR 只用于判定抛物律适用性，线性入口不计算
    const pbrInput = law === 'parabolic' ? parsePbr(body.pillingBedworth) : undefined;

    const k = resolveRateConstant(baseK, arrhenius, oxygen);
    const thickness =
      law === 'parabolic'
        ? parabolicThickness(k.effective, time)
        : linearThickness(k.effective, time);

    const response: Record<string, unknown> = {
      law,
      time,
      timeUnit: 's',
      rateConstant: {
        base: k.base,
        effective: k.effective,
        arrheniusFactor: k.arrheniusFactor,
        oxygenFactor: k.oxygenFactor,
        unit: law === 'parabolic' ? 'm^2/s' : 'm/s',
      },
      thickness,
      thicknessUnit: 'm',
    };
    if (density !== undefined) {
      response.density = density;
      response.densityUnit = 'kg/m^3';
      response.massGain = massGainPerArea(thickness, density);
      response.massGainUnit = 'kg/m^2';
    }
    if (pbrInput) {
      response.pillingBedworth = assessParabolicApplicability(pillingBedworthRatio(pbrInput));
    }
    res.json(response);
  };
}

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // 两条增长律各自独立的计算入口，调用方点名哪条就走哪条
  app.post('/api/parabolic/thickness', thicknessHandler('parabolic'));
  app.post('/api/linear/thickness', thicknessHandler('linear'));

  // 由膜厚直接换算单位面积质量增益
  app.post('/api/mass-gain', (req: Request, res: Response) => {
    if (!isRecord(req.body)) {
      throw new ValidationError('请求体必须是 JSON 对象');
    }
    const thickness = requireNonNegativeNumber(req.body.thickness, 'thickness (m)');
    const density = requirePositiveNumber(req.body.density, 'density (kg/m^3)');
    res.json({
      thickness,
      thicknessUnit: 'm',
      density,
      densityUnit: 'kg/m^3',
      massGain: massGainPerArea(thickness, density),
      massGainUnit: 'kg/m^2',
    });
  });

  // 命名材料参数组：保存 / 列表 / 读取 / 删除（进程内存，重启不保留）
  app.post('/api/materials', (req: Request, res: Response) => {
    if (!isRecord(req.body)) {
      throw new ValidationError('请求体必须是 JSON 对象');
    }
    const { name } = req.body;
    if (typeof name !== 'string' || name.trim() === '') {
      throw new ValidationError('字段 name 必须是非空字符串');
    }
    const params = parseMaterialParams(req.body);
    const trimmed = name.trim();
    saveMaterial(trimmed, params);
    res.status(201).json({ name: trimmed, params });
  });

  app.get('/api/materials', (_req: Request, res: Response) => {
    res.json({ materials: listMaterials() });
  });

  app.get('/api/materials/:name', (req: Request, res: Response) => {
    const params = getMaterial(req.params.name);
    if (!params) {
      throw new NotFoundError(`未找到名为 "${req.params.name}" 的材料参数组`);
    }
    res.json({ name: req.params.name, params });
  });

  app.delete('/api/materials/:name', (req: Request, res: Response) => {
    if (!deleteMaterial(req.params.name)) {
      throw new NotFoundError(`未找到名为 "${req.params.name}" 的材料参数组`);
    }
    res.status(204).end();
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '路由不存在' } });
  });

  // 统一错误出口：校验/计算/查找失败都带原因返回，绝不闷头吐出非数
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (
      err instanceof ValidationError ||
      err instanceof ComputationError ||
      err instanceof NotFoundError
    ) {
      res.status(err.status).json({ error: { code: err.code, message: err.message } });
      return;
    }
    const maybe = err as { type?: string } | null;
    if (maybe?.type === 'entity.parse.failed') {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: '请求体不是合法 JSON' },
      });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务内部错误' } });
  });

  return app;
}
