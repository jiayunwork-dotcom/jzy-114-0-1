# 高温氧化膜厚度核算服务（oxidation-kinetics-service）

把课堂上的氧化增长规律做成可长期运行的 HTTP 计算服务。TypeScript + Node.js 20 + Express，只经 HTTP 提供计算，无页面。

## 计算模型

| 环节 | 公式 | 说明 |
| --- | --- | --- |
| 抛物律（扩散控制，本服务主角） | `x = √(k_p · t)` | 膜厚平方随时间线性增长：时间 4 倍 → 膜厚 2 倍；k 翻倍 → 膜厚 ×√2 |
| 线性律（界面反应控制） | `x = k_l · t` | 膜厚本身随时间线性增长：时间 4 倍 → 膜厚 4 倍 |
| Arrhenius 温度修正 | `k(T) = k_ref · exp[-Q/R · (1/T − 1/T_ref)]`；未给 `referenceTemperature` 时 `k(T) = A · exp(−Q/(R·T))`，输入常数视为指前因子 A | 升温 → k 变大 → 同时间膜更厚 |
| 氧分压修正 | `k_eff = k · (pO2)^n` | 分压指数 n 由调用方给定 |
| 质量增益 | `Δm/A = x · ρ_oxide` | 按氧化物密度近似 |
| Pilling–Bedworth 比 | `PBR = (M_ox/ρ_ox) / (n · M_m/ρ_m)` | PBR > 1 且膜致密时才适用抛物律，判定结果在响应里如实标出 |

两条增长律是**两个独立入口**，各走各的公式，不叠加、不混用。

单位约定（SI）：`k_p` m²/s、`k_l` m/s、`time` s、`thickness` m、`density` kg/m³、`massGain` kg/m²、温度 K、激活能 J/mol、气体常数 J/(mol·K)、摩尔质量 g/mol。

## 接口

### `POST /api/parabolic/thickness` — 抛物律膜厚

```json
{
  "rateConstant": 2.5e-13,
  "time": 3600,
  "density": 5240,
  "arrhenius": { "activationEnergy": 96000, "gasConstant": 8.314, "temperature": 1073.15, "referenceTemperature": 1000 },
  "oxygen": { "partialPressure": 0.21, "exponent": 0.5 },
  "pillingBedworth": { "metalMolarMass": 55.845, "metalDensity": 7874, "oxideMolarMass": 159.687, "oxideDensity": 5240, "metalAtomsPerOxideUnit": 2 },
  "material": "fe2o3-1273k"
}
```

必填：`rateConstant`、`time`。可选：`density`（给了就返回质量增益）、`arrhenius`（先修正 k 再算）、`oxygen`、`pillingBedworth`（返回 PBR 与抛物律适用性判定）、`material`（引用已保存参数组，请求内显式字段覆盖存储值）。

响应（节选）：`thickness` (m)、`massGain` (kg/m²)、`rateConstant.effective`、`pillingBedworth.{ratio, parabolicApplicable, note}`。

### `POST /api/linear/thickness` — 线性律膜厚

同上，但速率常数字段为 `linearRateConstant` (m/s)，走 `x = k_l · t`，不计算 PBR。

### `POST /api/mass-gain` — 由膜厚换算质量增益

```json
{ "thickness": 3e-5, "density": 5240 }
```

### 命名材料参数组（进程内存，重启不保留）

- `POST /api/materials` `{ "name": "fe2o3-1273k", "rateConstant": 2.5e-13, "density": 5240, ... }` → 201
- `GET /api/materials` → 名字列表
- `GET /api/materials/:name` → 参数
- `DELETE /api/materials/:name` → 204

计算接口用 `"material": "<name>"` 引用；存取均深拷贝，多组参数并发计算互不影响。

### 错误响应

输入在进入计算前校验，失败返回带原因的 JSON：

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "字段 time (s) 不能为负值，收到: -5" } }
```

- `400`：负时间、非正速率常数、温度不在 [273.15, 6000] K（摄氏/开尔文弄混会在此被拦下）、非法 JSON 等；
- `404`：引用的材料参数组不存在；
- `422`：计算过程中出现非有限结果（如 Arrhenius 指数溢出），绝不把 NaN/Infinity 当结果返回。

## 运行

```bash
npm install
npm test          # 自动化测试（node:test + tsx）
npm run build     # 编译到 dist/
npm start         # 监听 PORT（默认 3000）
npm run dev       # 免编译直接跑（tsx）
```

## Docker

```bash
docker build -t oxidation-kinetics .
docker run --rm -p 3000:3000 oxidation-kinetics
```

容器起来后即可访问 `/api/parabolic/thickness`、`/api/linear/thickness`、`/api/mass-gain`（`docker-compose up` 为可选便捷方式）。

## 快速验证

```bash
# 铁氧化皮基准：k_p = 2.5e-13 m²/s，1 h → 30 µm，质量增益 0.1572 kg/m²
curl -X POST localhost:3000/api/parabolic/thickness \
  -H 'content-type: application/json' \
  -d '{"rateConstant":2.5e-13,"time":3600,"density":5240}'
```

膜厚随 √t 增长肉眼可核：`time` 取 3600 / 14400 / 32400，膜厚恰为 30 / 60 / 90 µm。

## 测试覆盖的正确性尺子

- 时间放大 4 倍 → 膜厚正好翻倍（若错写成 x ∝ t 会退化成 4 倍，测试必抓）；
- 速率常数翻倍 → 膜厚 ×√2；
- 温度升高 → Arrhenius 修正后 k 变大、同时间膜更厚；
- t = 0 → x = 0；
- 铁氧化皮基准算例（30/60/90 µm 的 √t 序列）钉进回归；
- 线性入口保持 x ∝ t（时间 4 倍 → 膜厚 4 倍），与抛物入口泾渭分明；
- 负时间、非正速率常数、温度单位弄混等在计算前被 400 挡下并交代原因；
- 两组材料参数并发计算，中间结果彼此隔离。

## 代码结构（按环节拆分，接口层轻薄）

```
src/
  parabolic.ts       抛物律膜厚求解 x = √(k·t)
  linear.ts          线性律膜厚求解 x = k·t
  arrhenius.ts       Arrhenius 温度修正
  oxygenPressure.ts  氧分压指数修正
  rateConstant.ts    组合修正，求有效速率常数
  massGain.ts        膜厚→质量增益换算 + PBR 适用性判定
  materials.ts       命名参数组存取（内存，深拷贝隔离）
  validation.ts      输入校验（计算前拦截，带原因报错）
  app.ts             Express 接口层：解析请求、驱动计算、组织返回
  server.ts          进程入口
test/                node:test 测试（单元 + HTTP 端到端）
```
