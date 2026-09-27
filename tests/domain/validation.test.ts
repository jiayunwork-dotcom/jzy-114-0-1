/** 不讲道理的输入必须在计算开始前被挡住并交代原因。 */
import { parabolicThickness } from '../../src/domain/parabolic';
import { linearThickness } from '../../src/domain/linear';
import { massGainPerArea } from '../../src/domain/film';

describe('输入校验（计算前拦截）', () => {
  test('氧化时间为负 -> 抛物律拒绝并说明原因', () => {
    expect(() => parabolicThickness(100, -1)).toThrow(/不能为负/);
  });

  test('氧化时间为负 -> 线性律拒绝', () => {
    expect(() => linearThickness(1, -2)).toThrow(/不能为负/);
  });

  test('速率常数为零/为负 -> 拒绝', () => {
    expect(() => parabolicThickness(0, 1)).toThrow(/必须为正数/);
    expect(() => parabolicThickness(-4, 1)).toThrow(/必须为正数/);
    expect(() => linearThickness(-1, 1)).toThrow(/必须为正数/);
  });

  test('密度为零/为负 -> 质量增益拒绝', () => {
    expect(() => massGainPerArea(10, 0)).toThrow(/必须为正数/);
    expect(() => massGainPerArea(10, -100)).toThrow(/必须为正数/);
  });
});
