/**
 * 抛物律核心性质测试——题目点名的三把尺子：
 *   1. 时间放大 4 倍，膜厚恰好翻倍
 *   2. 速率常数翻倍，膜厚按 √2 增大
 *   3. t = 0 膜厚为 0
 */
import { parabolicThickness } from '../../src/domain/parabolic';

const KP = 100; // µm²/h

describe('抛物律 x = sqrt(kp*t)', () => {
  test('时间放大 4 倍，膜厚恰好翻倍（抛物律的判据）', () => {
    const x1 = parabolicThickness(KP, 1).thickness;
    const x4 = parabolicThickness(KP, 4).thickness;
    expect(x4).toBeCloseTo(2 * x1, 12);
  });

  test('时间放大 9 倍，膜厚变为 3 倍', () => {
    const x1 = parabolicThickness(KP, 1).thickness;
    const x9 = parabolicThickness(KP, 9).thickness;
    expect(x9).toBeCloseTo(3 * x1, 12);
  });

  test('速率常数翻倍，膜厚按 √2 比例增大', () => {
    const x1 = parabolicThickness(KP, 4).thickness;
    const x2 = parabolicThickness(2 * KP, 4).thickness;
    expect(x2).toBeCloseTo(Math.SQRT2 * x1, 12);
  });

  test('时间取零，膜厚必须为零', () => {
    expect(parabolicThickness(KP, 0).thickness).toBe(0);
  });

  test('基本算例：kp=100 µm²/h, t=1 h -> x=10 µm', () => {
    const r = parabolicThickness(100, 1);
    expect(r.thickness).toBeCloseTo(10, 12);
    expect(r.law).toBe('parabolic');
  });

  test('防回归：抛物入口绝不能退化成 x 与 t 一次方成正比', () => {
    // 若有人错写成线性公式 x = k*t，时间 4 倍时膜厚会翻 4 倍。
    const x1 = parabolicThickness(KP, 1).thickness;
    const x4 = parabolicThickness(KP, 4).thickness;
    const linearMistakeRatio = x4 / x1; // 错误实现下 = 4
    expect(linearMistakeRatio).toBeCloseTo(2, 12);
    expect(linearMistakeRatio).not.toBeCloseTo(4, 6);
  });
});
