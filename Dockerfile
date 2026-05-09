# ---- Build Frontend ----
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit
COPY . .
RUN npm run build

# ---- Build Backend ----
FROM node:22-alpine AS backend-builder
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --no-audit
COPY server/ .
RUN npm run build

# ---- Production Runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app

# 创建非 root 用户
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 复制后端依赖
COPY --from=backend-builder /app/server/package.json /app/server/package-lock.json ./
RUN npm ci --omit=dev --no-audit

# 复制前端构建产物
COPY --from=frontend-builder /app/dist ./public

# 复制后端构建产物
COPY --from=backend-builder /app/server/dist ./dist

# 数据目录
RUN mkdir -p data storage/assets storage/temp
RUN chown -R appuser:appgroup data storage

USER appuser

ENV NODE_ENV=production
ENV PORT=8787

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

CMD ["node", "dist/src/index.js"]
