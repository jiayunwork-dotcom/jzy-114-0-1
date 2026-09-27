/**
 * HTTP 接口集成测试：容器起来后三个入口都应如此响应。
 * 通过 supertest 直连 Express app，不依赖外部端口。
 */
import request from 'supertest';
import { createApp } from '../../src/http/app';
import { IRON_SCALE_BENCHMARK as b } from '../fixtures/ironScale';

describe('HTTP 接口', () => {
  const app = createApp();

  describe('POST /oxide/parabolic', () => {
    test('基本抛物计算：kp=100, t=4 -> x=20 µm', async () => {
      const res = await request(app).post('/oxide/parabolic').send({ parabolicRateConstant: 100, time: 4 });
      expect(res.status).toBe(200);
      expect(res.body.law).toBe('parabolic');
      expect(res.body.thicknessUm).toBeCloseTo(20, 10);
      expect(res.body.effectiveRateConstant).toBe(100);
    });

    test('时间四倍膜厚翻倍（端到端再钉一遍）', async () => {
      const r1 = await request(app).post('/oxide/parabolic').send({ parabolicRateConstant: 2500, time: 1 });
      const r4 = await request(app).post('/oxide/parabolic').send({ parabolicRateConstant: 2500, time: 4 });
      expect(r4.body.thicknessUm).toBeCloseTo(2 * r1.body.thicknessUm, 10);
    });

    test('速率常数翻倍膜厚按 √2 增大', async () => {
      const r1 = await request(app).post('/oxide/parabolic').send({ parabolicRateConstant: 100, time: 4 });
      const r2 = await request(app).post('/oxide/parabolic').send({ parabolicRateConstant: 200, time: 4 });
      expect(r2.body.thicknessUm).toBeCloseTo(Math.SQRT2 * r1.body.thicknessUm, 10);
    });

    test('Arrhenius：温度升高，同时间膜更厚，并回显修正段', async () => {
      const base = {
        parabolicRateConstant: 100,
        time: 4,
        activationEnergy: 200_000,
        gasConstant: 8.314,
        referenceTemperature: 1073.15
      };
      const cold = await request(app).post('/oxide/parabolic').send({ ...base, temperature: 1073.15 });
      const hot = await request(app).post('/oxide/parabolic').send({ ...base, temperature: 1173.15 });
      expect(cold.status).toBe(200);
      expect(hot.body.thicknessUm).toBeGreaterThan(cold.body.thicknessUm);
      expect(hot.body.temperatureCorrection.applied).toBe(true);
      expect(hot.body.temperatureCorrection.kAfterArrhenius).toBeGreaterThan(100);
    });

    test('t=0 -> 膜厚 0', async () => {
      const res = await request(app).post('/oxide/parabolic').send({ parabolicRateConstant: 100, time: 0 });
      expect(res.body.thicknessUm).toBe(0);
    });

    test('带密度时同响应返回质量增益', async () => {
      const res = await request(app)
        .post('/oxide/parabolic')
        .send({ parabolicRateConstant: b.kpUm2PerH, time: 4, density: b.densityKgM3 });
      expect(res.body.thicknessUm).toBeCloseTo(200, 8);
      expect(res.body.massGain.massGainPerAreaKgM2).toBeCloseTo(1.04, 8);
    });

    test('带 PBR 时如实标注抛物律适用性', async () => {
      const ok = await request(app)
        .post('/oxide/parabolic')
        .send({ parabolicRateConstant: 100, time: 1, pillingBedworthRatio: 1.7, dense: true });
      expect(ok.body.parabolicApplicability.parabolicApplicable).toBe(true);

      const bad = await request(app)
        .post('/oxide/parabolic')
        .send({ parabolicRateConstant: 100, time: 1, pillingBedworthRatio: 0.6 });
      expect(bad.body.parabolicApplicability.parabolicApplicable).toBe(false);
    });

    test('负时间 -> 400 带中文原因，绝不返回 NaN', async () => {
      const res = await request(app).post('/oxide/parabolic').send({ parabolicRateConstant: 100, time: -3 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ValidationError');
      expect(res.body.message).toContain('不能为负');
    });

    test('速率常数缺失 -> 400 指明缺什么', async () => {
      const res = await request(app).post('/oxide/parabolic').send({ time: 4 });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('parabolicRateConstant');
    });

    test('摄氏温度误当开尔文 -> 400 提示单位', async () => {
      const res = await request(app)
        .post('/oxide/parabolic')
        .send({
          parabolicRateConstant: 100,
          time: 4,
          activationEnergy: 200_000,
          gasConstant: 8.314,
          temperature: 900
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('开尔文');
    });

    test('温度修正三件套给一半 -> 400 而不是静默跳过', async () => {
      const res = await request(app)
        .post('/oxide/parabolic')
        .send({ parabolicRateConstant: 100, time: 4, activationEnergy: 200_000, temperature: 1173.15 });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('gasConstant');
    });

    test('kp 简写与分压修正可用', async () => {
      const res = await request(app)
        .post('/oxide/parabolic')
        .send({ kp: 100, time: 1, pO2: 0.4, pO2Ref: 0.1, oxygenPressureExponent: 1 / 6 });
      expect(res.status).toBe(200);
      expect(res.body.pressureCorrection.applied).toBe(true);
      expect(res.body.effectiveRateConstant).toBeCloseTo(100 * Math.pow(4, 1 / 6), 8);
    });
  });

  describe('POST /oxide/linear', () => {
    test('线性计算：kl=0.5, t=10 -> x=5 µm', async () => {
      const res = await request(app).post('/oxide/linear').send({ linearRateConstant: 0.5, time: 10 });
      expect(res.status).toBe(200);
      expect(res.body.law).toBe('linear');
      expect(res.body.thicknessUm).toBeCloseTo(5, 10);
    });

    test('线性入口时间四倍膜厚也四倍（与抛物入口行为不同）', async () => {
      const r1 = await request(app).post('/oxide/linear').send({ linearRateConstant: 2, time: 1 });
      const r4 = await request(app).post('/oxide/linear').send({ linearRateConstant: 2, time: 4 });
      expect(r4.body.thicknessUm).toBeCloseTo(4 * r1.body.thicknessUm, 10);
    });

    test('线性入口不返回 PBR 抛物适用性判定', async () => {
      const res = await request(app)
        .post('/oxide/linear')
        .send({ linearRateConstant: 1, time: 1, pillingBedworthRatio: 1.7 });
      expect(res.body.parabolicApplicability).toBeUndefined();
    });

    test('kl=0 -> 400', async () => {
      const res = await request(app).post('/oxide/linear').send({ linearRateConstant: 0, time: 1 });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /oxide/mass-gain', () => {
    test('100 µm + 5200 kg/m³ -> 0.52 kg/m² 与 0.052 g/cm²', async () => {
      const res = await request(app).post('/oxide/mass-gain').send({ thickness: 100, density: 5200 });
      expect(res.status).toBe(200);
      expect(res.body.massGainPerAreaKgM2).toBeCloseTo(0.52, 10);
      expect(res.body.massGainPerAreaGcm2).toBeCloseTo(0.052, 10);
    });

    test('密度为负 -> 400', async () => {
      const res = await request(app).post('/oxide/mass-gain').send({ thickness: 10, density: -1 });
      expect(res.status).toBe(400);
    });
  });

  test('健康检查', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('未知路由返回 JSON 404 而非页面', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
  });
});
