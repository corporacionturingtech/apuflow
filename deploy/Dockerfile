# Imagen única: API (Fastify) + build de web. Contexto de construcción: la raíz del repo.
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS construir
COPY . .
RUN pnpm install --frozen-lockfile --config.strictDepBuilds=false && pnpm --filter web build

FROM base
ENV NODE_ENV=production \
    PORT=3000 \
    WEB_DIST=/app/apps/web/dist \
    MIGRAR_AL_ARRANCAR=1
COPY --from=construir /app /app
EXPOSE 3000
CMD ["pnpm", "--filter", "api", "exec", "tsx", "src/index.ts"]
