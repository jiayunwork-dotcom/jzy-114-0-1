import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app';

export function approxEqual(actual: number, expected: number, relTol = 1e-9, absTol = 1e-15): boolean {
  return Math.abs(actual - expected) <= Math.max(absTol, relTol * Math.abs(expected));
}

export interface RunningServer {
  url: string;
  close: () => Promise<void>;
}

/** 在随机空闲端口起服务，测完关闭 */
export async function startServer(): Promise<RunningServer> {
  const app = createApp();
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

export interface JsonResponse {
  status: number;
  body: any;
}

export async function postJson(url: string, payload: unknown): Promise<JsonResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json() } as unknown as JsonResponse;
}

export async function getJson(url: string): Promise<any> {
  const res = await fetch(url);
  return res.json();
}
