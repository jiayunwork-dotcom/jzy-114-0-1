import assert from 'node:assert/strict';
import { test } from 'node:test';
import { approxEqual, getJson, postJson, startServer } from './util';

/**
 * 命名材料参数组：保存、复用、隔离。
 * 两组参数同时计算时，各自的膜厚/质量增益等结果不得互相串扰。
 */

test('命名材料参数组', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  await t.test('保存、列表、读取、删除', async () => {
    const created = await postJson(`${server.url}/api/materials`, {
      name: 'fe2o3-1273k',
      rateConstant: 2.5e-13,
      density: 5240,
    });
    assert.equal(created.status, 201);

    const list = await getJson(`${server.url}/api/materials`);
    assert.ok(list.materials.includes('fe2o3-1273k'));

    const got = await getJson(`${server.url}/api/materials/fe2o3-1273k`);
    assert.equal(got.params.rateConstant, 2.5e-13);
    assert.equal(got.params.density, 5240);

    const del = await fetch(`${server.url}/api/materials/fe2o3-1273k`, { method: 'DELETE' });
    assert.equal(del.status, 204);
    const missing = await fetch(`${server.url}/api/materials/fe2o3-1273k`);
    assert.equal(missing.status, 404);
  });

  await t.test('按名字复用参数组计算，请求内字段可覆盖', async () => {
    await postJson(`${server.url}/api/materials`, { name: 'alloy-a', rateConstant: 1e-13, density: 5000 });
    const byName = await postJson(`${server.url}/api/parabolic/thickness`, { material: 'alloy-a', time: 3600 });
    assert.equal(byName.status, 200);
    assert.ok(approxEqual(byName.body.thickness, Math.sqrt(1e-13 * 3600)));
    assert.ok(approxEqual(byName.body.massGain, Math.sqrt(1e-13 * 3600) * 5000));

    // 覆盖时间以外的字段：临时改用别的速率常数，不污染存储值
    const overridden = await postJson(`${server.url}/api/parabolic/thickness`, {
      material: 'alloy-a',
      rateConstant: 4e-13,
      time: 3600,
    });
    assert.ok(approxEqual(overridden.body.thickness, Math.sqrt(4e-13 * 3600)));
    const stored = await getJson(`${server.url}/api/materials/alloy-a`);
    assert.equal(stored.params.rateConstant, 1e-13, '覆盖调用不得改写已存参数组');
  });

  await t.test('两组材料参数同时计算，中间结果彼此隔离', async () => {
    await postJson(`${server.url}/api/materials`, { name: 'mat-x', rateConstant: 1e-13, density: 5000 });
    await postJson(`${server.url}/api/materials`, { name: 'mat-y', rateConstant: 4e-13, density: 6000 });

    // 并发发起两组计算
    const [rx, ry] = await Promise.all([
      postJson(`${server.url}/api/parabolic/thickness`, { material: 'mat-x', time: 3600 }),
      postJson(`${server.url}/api/parabolic/thickness`, { material: 'mat-y', time: 3600 }),
    ]);
    assert.equal(rx.status, 200);
    assert.equal(ry.status, 200);

    // 各走各的速率常数：k 差 4 倍 → 膜厚差 2 倍；密度各用各的
    assert.ok(approxEqual(rx.body.thickness, Math.sqrt(1e-13 * 3600)));
    assert.ok(approxEqual(ry.body.thickness, Math.sqrt(4e-13 * 3600)));
    assert.ok(approxEqual(ry.body.thickness / rx.body.thickness, 2));
    assert.ok(approxEqual(rx.body.massGain, Math.sqrt(1e-13 * 3600) * 5000));
    assert.ok(approxEqual(ry.body.massGain, Math.sqrt(4e-13 * 3600) * 6000));

    // 算完之后存储值原样未动
    const x = await getJson(`${server.url}/api/materials/mat-x`);
    const y = await getJson(`${server.url}/api/materials/mat-y`);
    assert.equal(x.params.rateConstant, 1e-13);
    assert.equal(y.params.rateConstant, 4e-13);
  });

  await t.test('读取到的参数组是拷贝，改动不会污染仓库', async () => {
    await postJson(`${server.url}/api/materials`, { name: 'mat-z', rateConstant: 1e-13 });
    const got = await getJson(`${server.url}/api/materials/mat-z`);
    got.params.rateConstant = 999;
    const again = await getJson(`${server.url}/api/materials/mat-z`);
    assert.equal(again.params.rateConstant, 1e-13);
  });

  await t.test('引用不存在的参数组 → 404 并交代原因', async () => {
    const r = await postJson(`${server.url}/api/parabolic/thickness`, { material: 'no-such', time: 1 });
    assert.equal(r.status, 404);
    assert.match(r.body.error.message, /no-such/);
  });

  await t.test('空参数组不允许保存', async () => {
    const r = await postJson(`${server.url}/api/materials`, { name: 'empty' });
    assert.equal(r.status, 400);
  });
});
