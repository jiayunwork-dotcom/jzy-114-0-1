import assert from 'node:assert/strict';
import { test } from 'node:test';
import { approxEqual, postJson, startServer } from './util';

/**
 * 接口层端到端测试：三条核心性质（时间 4 倍→膜厚翻倍、速率常数翻倍→膜厚 ×√2、
 * 升温→同时间膜更厚）在 HTTP 层钉牢；同时验证两个入口各走各的公式、
 * 错误输入在计算前被带原因地挡下。
 */

const KP = 2.5e-13; // m^2/s

test('HTTP 接口端到端', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  await t.test('health 可用', async () => {
    const res = await fetch(`${server.url}/health`);
    assert.equal(res.status, 200);
  });

  await t.test('抛物膜厚接口：铁氧化皮基准（1 h → 30 µm，质量增益 0.1572 kg/m^2）', async () => {
    const { status, body } = await postJson(`${server.url}/api/parabolic/thickness`, {
      rateConstant: KP,
      time: 3600,
      density: 5240,
    });
    assert.equal(status, 200);
    assert.equal(body.law, 'parabolic');
    assert.ok(approxEqual(body.thickness, 3e-5), `膜厚应为 30 µm，实际 ${body.thickness}`);
    assert.ok(approxEqual(body.massGain, 0.1572), `质量增益应为 0.1572，实际 ${body.massGain}`);
    assert.equal(body.thicknessUnit, 'm');
    assert.equal(body.massGainUnit, 'kg/m^2');
  });

  await t.test('时间放大 4 倍 → 膜厚正好翻倍（接口级）', async () => {
    const x1 = (await postJson(`${server.url}/api/parabolic/thickness`, { rateConstant: KP, time: 3600 })).body;
    const x4 = (await postJson(`${server.url}/api/parabolic/thickness`, { rateConstant: KP, time: 14400 })).body;
    assert.ok(approxEqual(x4.thickness / x1.thickness, 2));
  });

  await t.test('速率常数翻倍 → 膜厚按 √2 倍增大（接口级）', async () => {
    const x1 = (await postJson(`${server.url}/api/parabolic/thickness`, { rateConstant: KP, time: 3600 })).body;
    const x2 = (await postJson(`${server.url}/api/parabolic/thickness`, { rateConstant: 2 * KP, time: 3600 })).body;
    assert.ok(approxEqual(x2.thickness / x1.thickness, Math.SQRT2));
  });

  await t.test('温度调高 → Arrhenius 修正后同时间膜更厚（接口级）', async () => {
    const base = { rateConstant: KP, time: 3600, arrhenius: { activationEnergy: 96000, gasConstant: 8.314, referenceTemperature: 1000 } };
    const low = await postJson(`${server.url}/api/parabolic/thickness`, { ...base, arrhenius: { ...base.arrhenius, temperature: 1000 } });
    const high = await postJson(`${server.url}/api/parabolic/thickness`, { ...base, arrhenius: { ...base.arrhenius, temperature: 1100 } });
    assert.equal(low.status, 200);
    assert.equal(high.status, 200);
    assert.ok(high.body.thickness > low.body.thickness, `升温应更厚：${low.body.thickness} → ${high.body.thickness}`);
    assert.ok(high.body.rateConstant.effective > low.body.rateConstant.effective);
  });

  await t.test('时间为零 → 膜厚为零（接口级）', async () => {
    const { status, body } = await postJson(`${server.url}/api/parabolic/thickness`, { rateConstant: KP, time: 0 });
    assert.equal(status, 200);
    assert.equal(body.thickness, 0);
  });

  await t.test('线性膜厚接口：时间 4 倍 → 膜厚 4 倍（与抛物入口泾渭分明）', async () => {
    const x1 = (await postJson(`${server.url}/api/linear/thickness`, { linearRateConstant: 1e-9, time: 3600 })).body;
    const x4 = (await postJson(`${server.url}/api/linear/thickness`, { linearRateConstant: 1e-9, time: 14400 })).body;
    assert.ok(approxEqual(x1.thickness, 3.6e-6));
    assert.ok(approxEqual(x4.thickness / x1.thickness, 4), '线性入口必须走 x ∝ t');
  });

  await t.test('两个入口的速率常数字段不混用', async () => {
    // 只给抛物常数去打线性入口 → 报错；反之亦然
    const r1 = await postJson(`${server.url}/api/linear/thickness`, { rateConstant: KP, time: 3600 });
    assert.equal(r1.status, 400);
    assert.match(r1.body.error.message, /linearRateConstant/);
    const r2 = await postJson(`${server.url}/api/parabolic/thickness`, { linearRateConstant: 1e-9, time: 3600 });
    assert.equal(r2.status, 400);
    assert.match(r2.body.error.message, /rateConstant/);
  });

  await t.test('质量增益接口：膜厚 × 密度', async () => {
    const { status, body } = await postJson(`${server.url}/api/mass-gain`, { thickness: 3e-5, density: 5240 });
    assert.equal(status, 200);
    assert.ok(approxEqual(body.massGain, 0.1572));
  });

  await t.test('氧分压修正：pO2 升到 4 倍、指数 0.5 → 膜厚 ×√2', async () => {
    const lo = (await postJson(`${server.url}/api/parabolic/thickness`, {
      rateConstant: KP, time: 3600, oxygen: { partialPressure: 0.21, exponent: 0.5 },
    })).body;
    const hi = (await postJson(`${server.url}/api/parabolic/thickness`, {
      rateConstant: KP, time: 3600, oxygen: { partialPressure: 0.84, exponent: 0.5 },
    })).body;
    assert.ok(approxEqual(hi.thickness / lo.thickness, Math.SQRT2));
  });

  await t.test('PBR 判定在抛物入口的返回里如实标出', async () => {
    const { status, body } = await postJson(`${server.url}/api/parabolic/thickness`, {
      rateConstant: KP,
      time: 3600,
      pillingBedworth: {
        metalMolarMass: 55.845,
        metalDensity: 7874,
        oxideMolarMass: 159.687,
        oxideDensity: 5240,
        metalAtomsPerOxideUnit: 2,
      },
    });
    assert.equal(status, 200);
    assert.ok(approxEqual(body.pillingBedworth.ratio, 2.14, 0.01));
    assert.equal(body.pillingBedworth.parabolicApplicable, true);
  });

  await t.test('错误输入在计算前被挡下并交代原因', async () => {
    // 负时间
    let r = await postJson(`${server.url}/api/parabolic/thickness`, { rateConstant: KP, time: -1 });
    assert.equal(r.status, 400);
    assert.match(r.body.error.message, /time/);
    assert.match(r.body.error.message, /负/);

    // 速率常数非正
    r = await postJson(`${server.url}/api/parabolic/thickness`, { rateConstant: 0, time: 3600 });
    assert.equal(r.status, 400);
    assert.match(r.body.error.message, /rateConstant/);
    r = await postJson(`${server.url}/api/parabolic/thickness`, { rateConstant: -1e-13, time: 3600 });
    assert.equal(r.status, 400);

    // 温度单位弄乱：把 25 °C 当 25 K 传进来
    r = await postJson(`${server.url}/api/parabolic/thickness`, {
      rateConstant: KP,
      time: 3600,
      arrhenius: { activationEnergy: 96000, gasConstant: 8.314, temperature: 25 },
    });
    assert.equal(r.status, 400);
    assert.match(r.body.error.message, /开尔文/);

    // 非法 JSON
    const raw = await fetch(`${server.url}/api/parabolic/thickness`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    assert.equal(raw.status, 400);
  });

  await t.test('响应里绝不出现 NaN / Infinity', async () => {
    const { status, body } = await postJson(`${server.url}/api/parabolic/thickness`, {
      rateConstant: KP,
      time: 3600,
      arrhenius: { activationEnergy: 1e308, gasConstant: 8.314, temperature: 273.15, referenceTemperature: 6000 },
    });
    assert.equal(status, 422);
    assert.match(body.error.message, /Arrhenius/);
  });
});
