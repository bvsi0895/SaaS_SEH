FROM node:20-alpine AS builder

WORKDIR /workspace

# Argumento para la URL del API
ARG VITE_API_URL=http://localhost:3000/api
ENV VITE_API_URL=$VITE_API_URL

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json web/package.json

RUN pnpm install --frozen-lockfile --config.store-dir=/pnpm/store --config.package-import-method=copy --filter seh-web...

COPY web web

# Compilar aplicacion
RUN pnpm --filter seh-web build

# Etapa 2: Servidor Nginx
FROM nginx:alpine AS production

# Copiar configuracion de nginx
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build desde etapa anterior
COPY --from=builder /workspace/web/dist /usr/share/nginx/html

# Exponer puerto
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

# Comando de inicio
CMD ["nginx", "-g", "daemon off;"]
