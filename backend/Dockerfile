# Etapa 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm ci

# Copiar codigo fuente
COPY . .

# Generar cliente Prisma
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Etapa 2: Produccion
FROM node:20-alpine AS production

WORKDIR /app

# Instalar solo dependencias de produccion
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

# Generar cliente Prisma
RUN npx prisma generate

# Copiar build desde etapa anterior
COPY --from=builder /app/dist ./dist

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api || exit 1

# Comando de inicio
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
