# 高温氧化膜厚度核算服务（oxide-film-service）

把课堂上的**高温氧化增长规律**做成长期运行、可经 HTTP 调用的计算服务（TypeScript + Node.js 20 + Express）。无页面，只提供 JSON 接口；不做热处理排产、不做氧化皮台账。

## 物理模型（两条增长律严格分开，不混用、不叠加）

| 增长律 | 控制环节 | 公式 | 入口 |
|---|---|---|---|
| **抛物律**（本服务主角） | 扩散控制 | **x² = kp·t**，即 x = √(kp·t) | `POST /oxide/parabolic` |
| **线性律** | 界面反应控制 | **x = kl·t** | `POST /oxide/linear` |

调用方点名走哪条就只走哪条，两套公式分文件实现，互不干扰。

- **Arrhenius 温度修正**：k(T) = k_ref·exp[−(Q/R)·(1/T − 1/T_ref)]；不传 T_ref 时把 k_ref 当前指因子 A。
- **氧分压修正**：k(pO₂) = k·(pO₂/pO₂_ref)^n，**分压指数 n 由调用方给定**。温度修正先于分压修正。
- **质量增益**：Δm/A = ρ·x（致密膜近似，ρ 用材料密度），同时给 kg/m² 与 g/cm²。
- **Pilling–Bedworth 适用性**：PBR = V_oxide/V_metal_consumed。PBR > 1 **且膜致密**才适用抛物增长；PBR ≤ 1（拉应力开裂）、膜不致密、PBR > 2（压应力剥落）均如实标注"不适用"及原因。只在抛物入口返回该判定。

### 单位约定（不做隐式单位换算）

| 量 | 单位 | 量 | 单位 |
|---|---|---|---|
| 时间 t | h | 膜厚 x | µm |
| kp | µm²/h | kl | µm/h |
| 温度 T / T_ref | **K**（900 ℃ 传 1173.15） | Q | J/mol |
| R | J/(mol·K)（8.314） | ρ | kg/m³ |
| pO₂ | atm（只用比值，bar 亦可） | Δm/A | kg/m²、g/cm² |

## 快速开始

```bash
npm install
npm test          # 81 个自动化测试
npm run build     # 编译到 dist/
npm start         # http://localhost:3000
# 或开发模式：npm run dev
```

Docker 一键启动（容器起来后三个接口即可访问）：

```bash
docker compose up --build -d
# 或：docker build -t oxide-film-service . && docker run -p 3000:3000 oxide-film-service
curl http://localhost:3000/health
```

## 接口

### 1. 抛物律膜厚 `POST /oxide/parabolic`

```json
{
  "parabolicRateConstant": 10000,
  "time": 4,
  "density": 5200,
  "pillingBedworthRatio": 1.7,
  "dense": true
}
```

速率常数也接受简写 `"kp"`。带温度修正（本次请求给目标温度即触发，Q/R/Tref 可来自命名参数组）：

```json
{
  "kp": 10000,
  "time": 4,
  "activationEnergy": 200000,
  "gasConstant": 8.314,
  "referenceTemperature": 1173.15,
  "temperature": 1273.15,
  "pO2": 0.4,
  "pO2Ref": 0.1,
  "oxygenPressureExponent": 0.1667
}
```

响应包含 `thicknessUm`、`effectiveRateConstant`、温度/分压修正的中间值回显、可选的 `massGain` 与 `parabolicApplicability`。

### 2. 线性律膜厚 `POST /oxide/linear`

```json
{ "linearRateConstant": 0.5, "time": 10 }
```

速率常数接受简写 `"kl"`。同样支持温度/分压修正与质量增益；**不返回**抛物适用性判定。

### 3. 质量增益 `POST /oxide/mass-gain`

```json
{ "thickness": 200, "density": 5200 }
```
→ `massGainPerAreaKgM2 = 1.04`，`massGainPerAreaGcm2 = 0.104`。

### 4. 命名材料参数组（运行期内存态，重启清空）

```bash
curl -X PUT localhost:3000/materials/iron900 -H 'Content-Type: application/json' -d '{
  "parabolicRateConstant": 10000, "activationEnergy": 200000,
  "gasConstant": 8.314, "referenceTemperature": 1173.15,
  "density": 5200, "pillingBedworthRatio": 1.7
}'
curl localhost:3000/materials                 # 列表
curl localhost:3000/materials/iron900        # 单组
curl -X DELETE localhost:3000/materials/iron900
```

计算时用 `"material": "iron900"` 引用；请求体内联字段覆盖组内缺省值（只影响本次请求，不改组）。两组参数同时计算彼此隔离（存取均为深拷贝，计算无共享状态）。

## 错误响应（计算开始前拦截，绝不返回 NaN）

```json
{ "error": "ValidationError", "field": "time", "message": "氧化时间不能为负值，实际收到: -1 h" }
```

覆盖：负时间、速率常数非正、密度非正、温度不在高温氧化范围 **[950, 4000] K**（900 ℃ 误传 900 K 会被挡下并提示单位）、温度修正三件套（Q/R/T）给一半、分压非正、JSON 非法等。

## 铁氧化皮基准算例（随仓库回归）

碳钢在空气 900 ℃ 量级，教学取 kp = 10 000 µm²/h、ρ ≈ 5200 kg/m³（FeO 主导混合层），x = √(kp·t)：

| t (h) | 1 | 4 | 9 | 16 | 25 |
|---|---|---|---|---|---|
| x (µm) | 100 | 200 | 300 | 400 | 500 |
| Δm/A (kg/m²) | 0.52 | 1.04 | 1.56 | 2.08 | 2.60 |

见 `tests/fixtures/ironScale.ts` 与 `tests/regression/ironScaleBenchmark.test.ts`。
（不同钢种/气氛 kp 可差数倍，工艺核算请以实测热重数据拟合为准。）

## 工程结构（按环节拆文件）

```
src/
  domain/
    parabolic.ts       # 抛物律膜厚 x=√(kp·t)
    linear.ts          # 线性律膜厚 x=kl·t（独立文件）
    arrhenius.ts       # Arrhenius 温度修正
    oxygenPressure.ts  # 氧分压指数修正
    kinetics.ts        # 修正顺序编排（先温度后分压）
    film.ts            # 质量增益 + PBR 判定
    materialStore.ts   # 命名参数组存取（内存态、深拷贝隔离）
    validation.ts      # 输入校验（独立）
    errors.ts  types.ts
  http/
    app.ts             # Express 装配 + 错误映射
    routes.ts          # 轻薄路由：解析/驱动/组织返回
    requestModel.ts    # 请求体 + 命名组合并
    calculationService.ts
  server.ts            # 入口
tests/                 # domain / api / regression / fixtures
```

## 测试盯的尺子

- 时间 ×4 → 抛物膜厚恰好 ×2（且显式断言"绝不是 ×4"，抓抛物误写成线性）；
- kp ×2 → 膜厚 ×√2；线性入口对照：t ×4 → x ×4；
- Arrhenius：温度调高 → k 变大 → 同时间膜更厚；t = 0 → x = 0；
- 铁氧化皮整条 √t 曲线与质量增益基准；
- 非法输入在计算前 400 并带原因；命名组隔离与深拷贝。
