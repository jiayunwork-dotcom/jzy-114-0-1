/**
 * Express 应用装配：只暴露 JSON HTTP 接口，不提供任何页面。
 * 错误在真正计算前被领域层挡住，这里统一映射为带原因的错误响应。
 */
import express, { Application, Request, Response, NextFunction } from 'express';
import { MaterialStore } from '../domain/materialStore';
import { ValidationError, NotFoundError } from '../domain/errors';
import { createCalculationRouter, createMaterialRouter } from './routes';

export function createApp(store: MaterialStore = new MaterialStore()): Application {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'oxide-film-service' });
  });

  app.use('/oxide', createCalculationRouter(store));
  app.use('/materials', createMaterialRouter(store));

  // 未匹配路由 -> JSON 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found', message: '接口不存在；可用入口见 /health 与项目 README' });
  });

  // 统一错误处理：入参错误一律 400 + 中文原因，绝不吐出 NaN
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: 'NotFound', message: err.message });
      return;
    }
    if (err instanceof ValidationError) {
      res.status(400).json({
        error: 'ValidationError',
        field: err.field,
        message: err.message
      });
      return;
    }
    // Express body-parser 的 JSON 解析错误
    if (err instanceof SyntaxError && 'body' in (err as object)) {
      res.status(400).json({ error: 'ValidationError', message: '请求体不是合法 JSON' });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'InternalError', message });
  });

  return app;
}
