# ===========================================
# SEH - Makefile
# ===========================================

.PHONY: help dev prod build down logs clean db-seed db-studio

# Variables
DOCKER_COMPOSE = docker-compose
DOCKER_COMPOSE_DEV = docker-compose -f docker-compose.dev.yml

help: ## Mostrar ayuda
	@echo "SEH - Sistema de Seguridad e Higiene"
	@echo ""
	@echo "Comandos disponibles:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# ==========================================
# Desarrollo
# ==========================================

dev: ## Iniciar solo PostgreSQL para desarrollo
	$(DOCKER_COMPOSE_DEV) up -d
	@echo ""
	@echo "PostgreSQL iniciado en puerto 5432"
	@echo "Adminer disponible en http://localhost:8080"
	@echo ""
	@echo "Para iniciar el backend:"
	@echo "  cd backend && npm run dev"
	@echo ""
	@echo "Para iniciar el frontend:"
	@echo "  cd web && npm run dev"

dev-down: ## Detener servicios de desarrollo
	$(DOCKER_COMPOSE_DEV) down

dev-logs: ## Ver logs de desarrollo
	$(DOCKER_COMPOSE_DEV) logs -f

# ==========================================
# Produccion
# ==========================================

prod: ## Iniciar todo el sistema en produccion
	$(DOCKER_COMPOSE) up -d
	@echo ""
	@echo "Sistema SEH iniciado:"
	@echo "  - Web:     http://localhost"
	@echo "  - API:     http://localhost:3000"
	@echo "  - DB:      localhost:5432"

prod-build: ## Construir imagenes de produccion
	$(DOCKER_COMPOSE) build --no-cache

prod-down: ## Detener servicios de produccion
	$(DOCKER_COMPOSE) down

prod-logs: ## Ver logs de produccion
	$(DOCKER_COMPOSE) logs -f

prod-logs-backend: ## Ver logs del backend
	$(DOCKER_COMPOSE) logs -f backend

prod-logs-web: ## Ver logs del web
	$(DOCKER_COMPOSE) logs -f web

# ==========================================
# Base de datos
# ==========================================

db-seed: ## Ejecutar seed de la base de datos
	cd backend && npx prisma db seed

db-studio: ## Abrir Prisma Studio
	cd backend && npx prisma studio

db-migrate: ## Ejecutar migraciones
	cd backend && npx prisma migrate dev

db-reset: ## Resetear base de datos (CUIDADO: borra todos los datos)
	cd backend && npx prisma migrate reset

# ==========================================
# Limpieza
# ==========================================

clean: ## Limpiar volumenes y contenedores
	$(DOCKER_COMPOSE) down -v --remove-orphans
	$(DOCKER_COMPOSE_DEV) down -v --remove-orphans
	@echo "Limpieza completada"

clean-all: clean ## Limpiar todo incluyendo imagenes
	docker image prune -af
	@echo "Imagenes limpiadas"

# ==========================================
# Instalacion
# ==========================================

install: ## Instalar dependencias de todos los proyectos
	cd backend && npm install
	cd web && npm install
	cd mobile && npm install
	@echo "Dependencias instaladas"

setup: install dev ## Configuracion inicial completa
	@echo ""
	@echo "Esperando a que PostgreSQL este listo..."
	@sleep 5
	cd backend && npx prisma migrate dev
	cd backend && npx prisma db seed
	@echo ""
	@echo "==================================="
	@echo "Configuracion completada!"
	@echo "==================================="
	@echo ""
	@echo "Credenciales de prueba:"
	@echo "  Admin:      admin@empresademo.com.ar / Password123!"
	@echo "  Supervisor: supervisor@empresademo.com.ar / Password123!"
	@echo "  Tecnico:    tecnico1@empresademo.com.ar / Password123!"
