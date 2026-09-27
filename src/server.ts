/** 服务入口：Node.js 20 下长期运行的 HTTP 服务，无页面。 */
import { createApp } from './http/app';

const port = Number(process.env.PORT ?? 3000);

const app = createApp();

const server = app.listen(port, () => {
  console.log(`[oxide-film-service] listening on http://0.0.0.0:${port}`);
  console.log('POST /oxide/parabolic | POST /oxide/linear | POST /oxide/mass-gain');
});

function shutdown(signal: string): void {
  console.log(`[oxide-film-service] received ${signal}, shutting down`);
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
