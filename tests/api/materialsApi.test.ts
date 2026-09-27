/**
 * 命名材料参数组的 HTTP 端到端行为：
 * 保存/反复调用/内联覆盖/组间隔离。每个测试用独立 app（独立内存库）。
 */
import request from 'supertest';
import { createApp } from '../../src/http/app';

describe('命名材料参数组（内存态）', () => {
  const app = createApp();

  test('保存两组参数，分别以名称计算，结果互不串组', async () => {
    await request(app)
      .put('/materials/steelA')
      .send({ parabolicRateConstant: 100, density: 7800, pillingBedworthRatio: 1.7 });
    await request(app)
      .put('/materials/alloyB')
      .send({ parabolicRateConstant: 900, density: 4500, pillingBedworthRatio: 0.8 });

    const a = await request(app).post('/oxide/parabolic').send({ material: 'steelA', time: 4 });
    const b = await request(app).post('/oxide/parabolic').send({ material: 'alloyB', time: 4 });

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    // kp=100 -> 20 µm；kp=900 -> 60 µm；两者各自独立
    expect(a.body.thicknessUm).toBeCloseTo(20, 10);
    expect(b.body.thicknessUm).toBeCloseTo(60, 10);
    expect(a.body.material).toBe('steelA');
    expect(b.body.material).toBe('alloyB');
    // 密度也各取各的
    expect(a.body.massGain.densityKgM3).toBe(7800);
    expect(b.body.massGain.densityKgM3).toBe(4500);
    // PBR 判定不串组
    expect(a.body.parabolicApplicability.parabolicApplicable).toBe(true);
    expect(b.body.parabolicApplicability.parabolicApplicable).toBe(false);
  });

  test('同一组可反复调用；内联字段覆盖命名组缺省值', async () => {
    await request(app)
      .put('/materials/iron900')
      .send({
        parabolicRateConstant: 10000,
        activationEnergy: 200_000,
        gasConstant: 8.314,
        referenceTemperature: 1173.15,
        density: 5200
      });

    const first = await request(app).post('/oxide/parabolic').send({ material: 'iron900', time: 1 });
    const second = await request(app).post('/oxide/parabolic').send({ material: 'iron900', time: 4 });
    expect(second.body.thicknessUm).toBeCloseTo(2 * first.body.thicknessUm, 10);

    const overridden = await request(app)
      .post('/oxide/parabolic')
      .send({ material: 'iron900', time: 1, parabolicRateConstant: 4 });
    expect(overridden.body.thicknessUm).toBeCloseTo(2, 10); // 用内联 kp=4，而非组内 10000

    // 覆盖只影响本次请求，组内值不变
    const again = await request(app).post('/oxide/parabolic').send({ material: 'iron900', time: 1 });
    expect(again.body.thicknessUm).toBeCloseTo(100, 10);
  });

  test('温度由本次请求给出，引用命名组的 Q/R/Tref 完成 Arrhenius 修正', async () => {
    await request(app)
      .put('/materials/ironQ')
      .send({
        parabolicRateConstant: 100,
        activationEnergy: 200_000,
        gasConstant: 8.314,
        referenceTemperature: 1073.15
      });
    const hot = await request(app).post('/oxide/parabolic').send({ material: 'ironQ', time: 4, temperature: 1173.15 });
    expect(hot.body.temperatureCorrection.applied).toBe(true);
    expect(hot.body.effectiveRateConstant).toBeGreaterThan(100);
  });

  test('引用不存在的组名 -> 400', async () => {
    const res = await request(app).post('/oxide/parabolic').send({ material: 'ghost', time: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('ghost');
  });

  test('GET 列表 / GET 单组 / DELETE', async () => {
    await request(app).put('/materials/only').send({ parabolicRateConstant: 1 });
    const one = await request(app).get('/materials/only');
    expect(one.status).toBe(200);
    expect(one.body.parabolicRateConstant).toBe(1);

    const list = await request(app).get('/materials');
    expect(list.body.materials.map((m: { name: string }) => m.name)).toContain('only');

    const del = await request(app).delete('/materials/only');
    expect(del.status).toBe(200);
    const after = await request(app).get('/materials/only');
    expect(after.status).toBe(404);
  });

  test('非数字参数保存时即被拒绝', async () => {
    const res = await request(app).put('/materials/bad').send({ parabolicRateConstant: 'oops' });
    expect(res.status).toBe(400);
  });
});
