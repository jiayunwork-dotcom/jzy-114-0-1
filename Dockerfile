# 高温氧化膜厚度核算服务 —— 多阶段构建
# 构建阶段：Node.js 20 编译 TypeScript
FROM node:20-bookworm-slim AS build
WORKDIR /app

# 先装依赖（利用层缓存）
COPY package*.json ./
RUN npm ci

# 编译
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# 运行阶段：只带生产依赖与编译产物，镜像更小
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# 容器内非 root 运行
USER node
EXPOSE 3000

# 健康检查：容器编排可直接用
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
