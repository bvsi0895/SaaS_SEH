-- Preserve every existing finding and initialize its new lifecycle state.
CREATE TYPE "EstadoHallazgo" AS ENUM ('PENDIENTE', 'EN_CORRECCION', 'SOLUCIONADO');
CREATE TYPE "TipoEventoHallazgo" AS ENUM ('CREACION', 'CAMBIO_ESTADO', 'CORRECCION_INMEDIATA', 'VERIFICACION');

ALTER TABLE "hallazgos"
  ADD COLUMN "estado" "EstadoHallazgo" NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN "fechaResolucion" TIMESTAMP(3),
  ADD COLUMN "descripcionSolucion" TEXT,
  ADD COLUMN "responsableResolucionId" TEXT;

CREATE TABLE "hallazgos_historial" (
  "id" TEXT NOT NULL,
  "hallazgoId" TEXT NOT NULL,
  "tipo" "TipoEventoHallazgo" NOT NULL,
  "estadoAnterior" "EstadoHallazgo",
  "estadoNuevo" "EstadoHallazgo",
  "descripcion" TEXT NOT NULL,
  "evidenciaUrls" TEXT,
  "accionCorrectivaId" TEXT,
  "usuarioId" TEXT NOT NULL,
  "responsableId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "hallazgos_historial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "hallazgos_estado_idx" ON "hallazgos"("estado");
CREATE INDEX "hallazgos_responsableResolucionId_idx" ON "hallazgos"("responsableResolucionId");
CREATE INDEX "hallazgos_historial_hallazgoId_createdAt_idx" ON "hallazgos_historial"("hallazgoId", "createdAt");
CREATE INDEX "hallazgos_historial_accionCorrectivaId_idx" ON "hallazgos_historial"("accionCorrectivaId");

ALTER TABLE "hallazgos"
  ADD CONSTRAINT "hallazgos_responsableResolucionId_fkey"
  FOREIGN KEY ("responsableResolucionId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "hallazgos_historial"
  ADD CONSTRAINT "hallazgos_historial_hallazgoId_fkey"
  FOREIGN KEY ("hallazgoId") REFERENCES "hallazgos"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "hallazgos_historial_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "hallazgos_historial_responsableId_fkey"
  FOREIGN KEY ("responsableId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
