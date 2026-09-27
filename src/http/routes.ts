/**
 * 路由：接口层保持轻薄——解析请求、驱动对应计算入口、组织返回。
 * 抛物与线性是两个独立入口，物理上也分在不同文件实现。
 */
import { Router, Request, Response, NextFunction } from 'express';
import { MaterialStore } from '../domain/materialStore';
import { NotFoundError } from '../domain/errors';
import { asObject, resolveThicknessRequest } from './requestModel';
import {
  runLinear,
  runMassGain,
  runParabolic
} from './calculationService';
import { requireFiniteNumber } from '../domain/validation';
import { MaterialParameterSet } from '../domain/types';

export function createCalculationRouter(store: MaterialStore): Router {
  const router = Router();

  // ---- 抛物律膜厚（主角）：x = sqrt(kp * t) ----
  router.post('/parabolic', (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = asObject(req.body);
      const model = resolveThicknessRequest(body, store, 'parabolic');
      res.json(runParabolic(model));
    } catch (err) {
      next(err);
    }
  });

  // ---- 线性律膜厚（独立入口）：x = kl * t ----
  router.post('/linear', (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = asObject(req.body);
      const model = resolveThicknessRequest(body, store, 'linear');
      res.json(runLinear(model));
    } catch (err) {
      next(err);
    }
  });

  // ---- 膜厚 + 密度 -> 单位面积质量增益 ----
  router.post('/mass-gain', (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = asObject(req.body);
      const thickness = requireFiniteNumber(body.thickness, 'thickness');
      const density = requireFiniteNumber(body.density, 'density');
      res.json(runMassGain({ thickness, density }));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/** 命名材料参数组：/materials 下的增删查（内存态） */
export function createMaterialRouter(store: MaterialStore): Router {
  const router = Router();

  router.put('/:name', (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = asObject(req.body);
      const input: Partial<MaterialParameterSet> = {};
      const copyFields = [
        'description',
        'parabolicRateConstant',
        'linearRateConstant',
        'activationEnergy',
        'gasConstant',
        'referenceTemperature',
        'referenceOxygenPressure',
        'oxygenPressureExponent',
        'density',
        'pillingBedworthRatio',
        'dense'
      ] as const;
      for (const f of copyFields) {
        if (body[f] !== undefined) (input as Record<string, unknown>)[f] = body[f];
      }
      const saved = store.save(req.params.name, input);
      res.status(200).json(saved);
    } catch (err) {
      next(err);
    }
  });

  router.get('/', (_req: Request, res: Response) => {
    res.json({ count: store.list().length, materials: store.list() });
  });

  router.get('/:name', (req: Request, res: Response, next: NextFunction) => {
    try {
      const found = store.get(req.params.name);
      if (!found) {
        throw new NotFoundError(`未找到名为 "${req.params.name}" 的材料参数组`);
      }
      res.json(found);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:name', (req: Request, res: Response) => {
    const ok = store.delete(req.params.name);
    res.status(ok ? 200 : 404).json({
      deleted: ok,
      name: req.params.name
    });
  });

  return router;
}
