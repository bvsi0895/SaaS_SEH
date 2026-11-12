FROM node:20-alpine AS builder

WORKDIR /workspace

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json

RUN pnpm install --frozen-lockfile --config.store-dir=/pnpm/store --config.package-import-method=copy --filter seh-backend...

COPY backend backend

RUN pnpm --filter seh-backend prisma:generate

RUN pnpm --filter seh-backend build
RUN pnpm --filter seh-backend deploy --prod=false /workspace/deploy

FROM node:20-alpine AS production

WORKDIR /app
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY --from=builder /workspace/deploy ./
COPY --from=builder /workspace/backend/prisma ./prisma
COPY --from=builder /workspace/backend/dist ./dist

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs

# Exponer puerto
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Comando de inicio
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main.js"]
