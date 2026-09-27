/**
 * 命名参数组：运行期内存存取 + 组间隔离。
 * 两组材料同时在算，各自的速率常数/中间结果不得串组。
 */
import { MaterialStore } from '../../src/domain/materialStore';

describe('MaterialStore 命名参数组', () => {
  let store: MaterialStore;
  beforeEach(() => {
    store = new MaterialStore();
  });

  test('保存后可按名取回，字段完整', () => {
    store.save('steelA', {
      parabolicRateConstant: 100,
      activationEnergy: 200_000,
      gasConstant: 8.314,
      density: 7800
    });
    const got = store.get('steelA')!;
    expect(got.parabolicRateConstant).toBe(100);
    expect(got.activationEnergy).toBe(200_000);
    expect(got.createdAt).toEqual(expect.any(String));
  });

  test('两组参数彼此隔离：A 组的 kp 不会出现在 B 组名下', () => {
    store.save('steelA', { parabolicRateConstant: 100, density: 7800 });
    store.save('alloyB', { parabolicRateConstant: 999, density: 4500 });

    const a1 = store.get('steelA')!;
    const b1 = store.get('alloyB')!;
    expect(a1.parabolicRateConstant).toBe(100);
    expect(b1.parabolicRateConstant).toBe(999);
    expect(a1.density).toBe(7800);
    expect(b1.density).toBe(4500);

    // 删除 A 不影响 B
    expect(store.delete('steelA')).toBe(true);
    expect(store.get('steelA')).toBeUndefined();
    expect(store.get('alloyB')!.parabolicRateConstant).toBe(999);
  });

  test('取出的对象是深拷贝：调用方篡改回写不进库', () => {
    store.save('steelA', { parabolicRateConstant: 100 });
    const handle = store.get('steelA')!;
    handle.parabolicRateConstant = 1;
    handle.name = 'hacked';
    expect(store.get('steelA')!.parabolicRateConstant).toBe(100);
    expect(store.get('steelA')!.name).toBe('steelA');
  });

  test('save 入参也是克隆：外部之后再改对象不影响已存记录', () => {
    const payload: Record<string, unknown> = { parabolicRateConstant: 100 };
    store.save('steelA', payload);
    payload.parabolicRateConstant = 2;
    expect(store.get('steelA')!.parabolicRateConstant).toBe(100);
  });

  test('非数字参数被拒绝', () => {
    expect(() => store.save('bad', { parabolicRateConstant: NaN })).toThrow();
    expect(() => store.save('bad', { parabolicRateConstant: 'huge' as unknown as number })).toThrow();
  });

  test('list 不泄露库内引用', () => {
    store.save('a', { parabolicRateConstant: 1 });
    const list = store.list();
    list[0].parabolicRateConstant = 2;
    expect(store.get('a')!.parabolicRateConstant).toBe(1);
  });
});
