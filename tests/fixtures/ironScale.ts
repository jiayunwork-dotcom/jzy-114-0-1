/**
 * 铁氧化皮（mill scale）数量级基准算例 —— 钉进回归测试，肉眼可核。
 *
 * 工况：碳钢在空气里 900 ℃（1173.15 K）持续氧化。
 * 教学口径取 kp ≈ 10 000 µm²/h（≈ 2.78×10⁻⁹ m²/s；
 * 注：不同钢种/气氛下 kp 可差数倍，本算例只取数量级做教学基准，
 * 正式工艺核算请用实测热重数据拟合 kp）。
 *
 * x = sqrt(kp·t)，随 √t 增长：
 *   t = 1 h  -> x = 100 µm
 *   t = 4 h  -> x = 200 µm
 *   t = 9 h  -> x = 300 µm
 *   t = 16 h -> x = 400 µm
 *   t = 25 h -> x = 500 µm
 *
 * 氧化皮以 FeO 为主，混合层体积密度教学取 ρ ≈ 5200 kg/m³：
 *   100 µm -> Δm/A = 0.52 kg/m²；400 µm -> 2.08 kg/m²。
 * 铁的 PBR（FeO/Fe）约 1.7，>1 且膜致密时抛物增长适用。
 */
export const IRON_SCALE_BENCHMARK = {
  material: 'iron-mill-scale-900C',
  temperatureK: 1173.15,
  kpUm2PerH: 10_000,
  densityKgM3: 5200,
  activationEnergyJPerMol: 200_000, // 铁氧化活化能常见量级 150~250 kJ/mol
  pillingBedworthRatio: 1.7,
  series: [
    { timeH: 1, thicknessUm: 100, massGainKgM2: 0.52 },
    { timeH: 4, thicknessUm: 200, massGainKgM2: 1.04 },
    { timeH: 9, thicknessUm: 300, massGainKgM2: 1.56 },
    { timeH: 16, thicknessUm: 400, massGainKgM2: 2.08 },
    { timeH: 25, thicknessUm: 500, massGainKgM2: 2.6 }
  ]
} as const;
