-- Núcleo comercial SaaS. La migración es compatible con datos existentes:
-- crea planes, suscripciones y auditoría sin modificar ni eliminar entidades operativas.
CREATE TYPE "EstadoSuscripcionSaaS" AS ENUM ('TRIAL', 'ACTIVA', 'SUSPENDIDA', 'VENCIDA', 'CANCELADA');
CREATE TYPE "EventoSuscripcionSaaS" AS ENUM ('CREADA', 'ACTIVADA', 'SUSPENDIDA', 'VENCIDA', 'CANCELADA', 'REACTIVADA', 'PLAN_CAMBIADO');

CREATE TABLE "planes_saas" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "maxUsuarios" INTEGER NOT NULL,
    "maxEmpresas" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "planes_saas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "suscripciones_saas" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "estado" "EstadoSuscripcionSaaS" NOT NULL DEFAULT 'TRIAL',
    "inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finPeriodo" TIMESTAMP(3),
    "pruebaFinalizaEn" TIMESTAMP(3),
    "suspendidaEn" TIMESTAMP(3),
    "canceladaEn" TIMESTAMP(3),
    "motivo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "suscripciones_saas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auditoria_suscripciones_saas" (
    "id" TEXT NOT NULL,
    "suscripcionId" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "actorUsuarioId" TEXT,
    "evento" "EventoSuscripcionSaaS" NOT NULL,
    "estadoAnterior" "EstadoSuscripcionSaaS",
    "estadoNuevo" "EstadoSuscripcionSaaS",
    "planAnteriorId" TEXT,
    "planNuevoId" TEXT,
    "motivo" TEXT,
    "metadata" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auditoria_suscripciones_saas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "administradores_saas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "administradores_saas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "planes_saas_codigo_key" ON "planes_saas"("codigo");
CREATE INDEX "planes_saas_activo_idx" ON "planes_saas"("activo");
CREATE UNIQUE INDEX "suscripciones_saas_organizacionId_key" ON "suscripciones_saas"("organizacionId");
CREATE INDEX "suscripciones_saas_estado_finPeriodo_idx" ON "suscripciones_saas"("estado", "finPeriodo");
CREATE INDEX "suscripciones_saas_planId_idx" ON "suscripciones_saas"("planId");
CREATE INDEX "auditoria_suscripciones_saas_organizacionId_creadoEn_idx" ON "auditoria_suscripciones_saas"("organizacionId", "creadoEn");
CREATE INDEX "auditoria_suscripciones_saas_suscripcionId_creadoEn_idx" ON "auditoria_suscripciones_saas"("suscripcionId", "creadoEn");
CREATE UNIQUE INDEX "administradores_saas_usuarioId_key" ON "administradores_saas"("usuarioId");
CREATE INDEX "administradores_saas_activo_idx" ON "administradores_saas"("activo");

ALTER TABLE "suscripciones_saas" ADD CONSTRAINT "suscripciones_saas_organizacionId_fkey"
  FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "suscripciones_saas" ADD CONSTRAINT "suscripciones_saas_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "planes_saas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auditoria_suscripciones_saas" ADD CONSTRAINT "auditoria_suscripciones_saas_suscripcionId_fkey"
  FOREIGN KEY ("suscripcionId") REFERENCES "suscripciones_saas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auditoria_suscripciones_saas" ADD CONSTRAINT "auditoria_suscripciones_saas_organizacionId_fkey"
  FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auditoria_suscripciones_saas" ADD CONSTRAINT "auditoria_suscripciones_saas_actorUsuarioId_fkey"
  FOREIGN KEY ("actorUsuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "administradores_saas" ADD CONSTRAINT "administradores_saas_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Planes iniciales. LEGACY_COMPAT conserva el funcionamiento de las consultoras
-- existentes hasta que el propietario les asigne un plan comercial.
INSERT INTO "planes_saas" ("id", "codigo", "nombre", "maxUsuarios", "maxEmpresas", "activo", "actualizadoEn") VALUES
  ('00000000-0000-4000-8000-000000000351', 'LEGACY_COMPAT', 'Compatibilidad heredada', 2147483647, 2147483647, true, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000352', 'DEMO_15_DIAS', 'Demo 15 días', 5, 2, true, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000353', 'PROFESIONAL', 'Profesional', 50, 25, true, CURRENT_TIMESTAMP)
ON CONFLICT ("codigo") DO NOTHING;

-- Cada organización existente recibe una suscripción ACTIVA de compatibilidad.
-- IDs deterministas hacen la operación idempotente y preservan toda la historia.
INSERT INTO "suscripciones_saas" ("id", "organizacionId", "planId", "estado", "inicio", "creadoEn", "actualizadoEn")
SELECT md5('legacy-saas-subscription:' || o."id")::uuid,
       o."id",
       '00000000-0000-4000-8000-000000000351',
       'ACTIVA',
       COALESCE(o."creadaEn", CURRENT_TIMESTAMP),
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM "organizaciones" o
ON CONFLICT ("organizacionId") DO NOTHING;

INSERT INTO "auditoria_suscripciones_saas" ("id", "suscripcionId", "organizacionId", "evento", "estadoNuevo", "planNuevoId", "motivo")
SELECT md5('legacy-saas-audit:' || s."id")::uuid,
       s."id",
       s."organizacionId",
       'CREADA',
       s."estado",
       s."planId",
       'Migración compatible del núcleo SaaS; no modifica datos operativos'
FROM "suscripciones_saas" s
WHERE s."planId" = '00000000-0000-4000-8000-000000000351'
ON CONFLICT ("id") DO NOTHING;

