-- Delegación de inspecciones: migración aditiva y segura para datos existentes.
ALTER TYPE "EstadoInspeccion" ADD VALUE IF NOT EXISTS 'PENDIENTE';

ALTER TABLE "inspecciones"
  ADD COLUMN "creadoPorId" TEXT,
  ADD COLUMN "asignadoAId" TEXT,
  ADD COLUMN "fechaProgramada" TIMESTAMP(3);

-- Cada inspección histórica conserva el técnico que ya tenía como creador y encargado.
UPDATE "inspecciones"
SET "creadoPorId" = "usuarioId",
    "asignadoAId" = "usuarioId"
WHERE "creadoPorId" IS NULL OR "asignadoAId" IS NULL;

ALTER TABLE "inspecciones"
  ALTER COLUMN "creadoPorId" SET NOT NULL,
  ALTER COLUMN "asignadoAId" SET NOT NULL,
  ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';

CREATE INDEX "inspecciones_creadoPorId_idx" ON "inspecciones"("creadoPorId");
CREATE INDEX "inspecciones_asignadoAId_idx" ON "inspecciones"("asignadoAId");
CREATE INDEX "inspecciones_fechaProgramada_idx" ON "inspecciones"("fechaProgramada");

ALTER TABLE "inspecciones"
  ADD CONSTRAINT "inspecciones_creadoPorId_fkey"
    FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inspecciones_asignadoAId_fkey"
    FOREIGN KEY ("asignadoAId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "inspeccion_reasignaciones" (
  "id" TEXT NOT NULL,
  "inspeccionId" TEXT NOT NULL,
  "desdeUsuarioId" TEXT,
  "haciaUsuarioId" TEXT NOT NULL,
  "efectuadaPorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inspeccion_reasignaciones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inspeccion_reasignaciones_inspeccionId_idx" ON "inspeccion_reasignaciones"("inspeccionId");
CREATE INDEX "inspeccion_reasignaciones_haciaUsuarioId_idx" ON "inspeccion_reasignaciones"("haciaUsuarioId");
CREATE INDEX "inspeccion_reasignaciones_efectuadaPorId_idx" ON "inspeccion_reasignaciones"("efectuadaPorId");

ALTER TABLE "inspeccion_reasignaciones"
  ADD CONSTRAINT "inspeccion_reasignaciones_inspeccionId_fkey"
    FOREIGN KEY ("inspeccionId") REFERENCES "inspecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "inspeccion_reasignaciones_desdeUsuarioId_fkey"
    FOREIGN KEY ("desdeUsuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inspeccion_reasignaciones_haciaUsuarioId_fkey"
    FOREIGN KEY ("haciaUsuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inspeccion_reasignaciones_efectuadaPorId_fkey"
    FOREIGN KEY ("efectuadaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

