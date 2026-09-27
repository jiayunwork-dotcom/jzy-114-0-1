/** 线性律：与抛物律分开验证。x = kl*t，时间 4 倍膜厚也 4 倍——正是两条律不能混的证据。 */
import { linearThickness } from '../../src/domain/linear';

describe('线性律 x = kl*t', () => {
  test('时间放大 4 倍，膜厚也翻 4 倍（对照抛物律的 2 倍）', () => {
    const x1 = linearThickness(2, 1).thickness;
    const x4 = linearThickness(2, 4).thickness;
    expect(x4).toBeCloseTo(4 * x1, 12);
  });

  test('速率常数翻倍，膜厚也翻倍（线性，不是 √2）', () => {
    const x1 = linearThickness(2, 3).thickness;
    const x2 = linearThickness(4, 3).thickness;
    expect(x2).toBeCloseTo(2 * x1, 12);
  });

  test('时间取零，膜厚为零', () => {
    expect(linearThickness(2, 0).thickness).toBe(0);
  });

  test('基本算例：kl=0.5 µm/h, t=10 h -> x=5 µm', () => {
    const r = linearThickness(0.5, 10);
    expect(r.thickness).toBeCloseTo(5, 12);
    expect(r.law).toBe('linear');
  });
});
