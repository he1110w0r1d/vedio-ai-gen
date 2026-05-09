# # ---- Build Frontend ----
# FROM node:22-alpine AS frontend-builder
# WORKDIR /app
# COPY package.json package-lock.json ./
# RUN npm ci --no-audit
# COPY . .
# RUN npm run build

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

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=backend-builder /app/server/package.json /app/server/package-lock.json ./
RUN npm ci --omit=dev --no-audit

# 仅后端镜像（前端通过反向代理提供）
COPY --from=backend-builder /app/server/dist ./dist

RUN mkdir -p data storage/assets storage/temp
RUN chown -R appuser:appgroup data storage

USER appuser

ENV NODE_ENV=production
ENV PORT=8787

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

CMD ["node", "dist/src/index.js"]
