#!/usr/bin/env bash
# 三个计算入口的调用示例（服务启动后直接运行：bash examples/curl-examples.sh）
set -e
BASE=${BASE:-http://localhost:3000}

echo "== 健康检查 =="
curl -s "$BASE/health"; echo

echo "== 抛物律：kp=10000 µm²/h, t=4 h, ρ=5200, PBR=1.7 =="
curl -s -X POST "$BASE/oxide/parabolic" -H 'Content-Type: application/json' \
  -d '{"parabolicRateConstant":10000,"time":4,"density":5200,"pillingBedworthRatio":1.7,"dense":true}'; echo

echo "== 抛物律 + Arrhenius（900℃ 参考，1000℃ 目标）+ 氧分压 =="
curl -s -X POST "$BASE/oxide/parabolic" -H 'Content-Type: application/json' \
  -d '{"kp":10000,"time":4,"activationEnergy":200000,"gasConstant":8.314,
       "referenceTemperature":1173.15,"temperature":1273.15,
       "pO2":0.4,"pO2Ref":0.1,"oxygenPressureExponent":0.1667}'; echo

echo "== 线性律：kl=0.5 µm/h, t=10 h =="
curl -s -X POST "$BASE/oxide/linear" -H 'Content-Type: application/json' \
  -d '{"linearRateConstant":0.5,"time":10}'; echo

echo "== 质量增益：200 µm, 5200 kg/m³ =="
curl -s -X POST "$BASE/oxide/mass-gain" -H 'Content-Type: application/json' \
  -d '{"thickness":200,"density":5200}'; echo

echo "== 保存命名参数组并引用 =="
curl -s -X PUT "$BASE/materials/iron900" -H 'Content-Type: application/json' \
  -d '{"parabolicRateConstant":10000,"activationEnergy":200000,"gasConstant":8.314,
       "referenceTemperature":1173.15,"density":5200,"pillingBedworthRatio":1.7}' >/dev/null
curl -s -X POST "$BASE/oxide/parabolic" -H 'Content-Type: application/json' \
  -d '{"material":"iron900","time":16}'; echo

echo "== 错误示例：负时间 =="
curl -s -X POST "$BASE/oxide/parabolic" -H 'Content-Type: application/json' \
  -d '{"kp":100,"time":-1}'; echo
