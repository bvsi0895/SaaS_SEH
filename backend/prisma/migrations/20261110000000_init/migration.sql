-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN_EMPRESA', 'SUPERVISOR', 'TECNICO');

-- CreateEnum
CREATE TYPE "TipoChecklist" AS ENUM ('GENERAL', 'EPP', 'ORDEN_LIMPIEZA', 'RIESGO_QUIMICO', 'MAQUINARIA', 'ERGONOMIA', 'INCENDIO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoInspeccion" AS ENUM ('EN_PROGRESO', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CumplimientoItem" AS ENUM ('PENDIENTE', 'CUMPLE', 'NO_CUMPLE', 'NO_APLICA', 'OBSERVACION');

-- CreateEnum
CREATE TYPE "NivelRiesgo" AS ENUM ('BAJO', 'MEDIO', 'ALTO', 'CRITICO');

-- CreateEnum
CREATE TYPE "EstadoAccion" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'RESUELTA', 'VENCIDA');

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cuit" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'TECNICO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcceso" TIMESTAMP(3),
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklists" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoChecklist" NOT NULL DEFAULT 'GENERAL',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "checklistId" TEXT NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspecciones" (
    "id" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaHoraInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaHoraFin" TIMESTAMP(3),
    "estado" "EstadoInspeccion" NOT NULL DEFAULT 'EN_PROGRESO',
    "ubicacionTexto" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empresaId" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "inspecciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspeccion_items" (
    "id" TEXT NOT NULL,
    "cumplimiento" "CumplimientoItem" NOT NULL DEFAULT 'CUMPLE',
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inspeccionId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,

    CONSTRAINT "inspeccion_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hallazgos" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "nivelRiesgo" "NivelRiesgo" NOT NULL DEFAULT 'MEDIO',
    "ubicacionTexto" TEXT NOT NULL,
    "fotosUrls" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inspeccionId" TEXT NOT NULL,

    CONSTRAINT "hallazgos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acciones_correctivas" (
    "id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fechaCompromiso" TIMESTAMP(3) NOT NULL,
    "fechaCierre" TIMESTAMP(3),
    "estado" "EstadoAccion" NOT NULL DEFAULT 'PENDIENTE',
    "evidenciaUrl" TEXT,
    "notasCierre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empresaId" TEXT NOT NULL,
    "hallazgoId" TEXT NOT NULL,
    "responsableTexto" TEXT,
    "responsableId" TEXT,
    "creadorId" TEXT NOT NULL,

    CONSTRAINT "acciones_correctivas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cuit_key" ON "empresas"("cuit");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_empresaId_idx" ON "usuarios"("empresaId");

-- CreateIndex
CREATE INDEX "checklists_empresaId_idx" ON "checklists"("empresaId");

-- CreateIndex
CREATE INDEX "checklists_tipo_idx" ON "checklists"("tipo");

-- CreateIndex
CREATE INDEX "checklist_items_checklistId_idx" ON "checklist_items"("checklistId");

-- CreateIndex
CREATE INDEX "inspecciones_empresaId_idx" ON "inspecciones"("empresaId");

-- CreateIndex
CREATE INDEX "inspecciones_usuarioId_idx" ON "inspecciones"("usuarioId");

-- CreateIndex
CREATE INDEX "inspecciones_checklistId_idx" ON "inspecciones"("checklistId");

-- CreateIndex
CREATE INDEX "inspecciones_estado_idx" ON "inspecciones"("estado");

-- CreateIndex
CREATE INDEX "inspecciones_fechaHoraInicio_idx" ON "inspecciones"("fechaHoraInicio");

-- CreateIndex
CREATE INDEX "inspeccion_items_inspeccionId_idx" ON "inspeccion_items"("inspeccionId");

-- CreateIndex
CREATE INDEX "inspeccion_items_checklistItemId_idx" ON "inspeccion_items"("checklistItemId");

-- CreateIndex
CREATE INDEX "hallazgos_inspeccionId_idx" ON "hallazgos"("inspeccionId");

-- CreateIndex
CREATE INDEX "hallazgos_nivelRiesgo_idx" ON "hallazgos"("nivelRiesgo");

-- CreateIndex
CREATE INDEX "acciones_correctivas_empresaId_idx" ON "acciones_correctivas"("empresaId");

-- CreateIndex
CREATE INDEX "acciones_correctivas_hallazgoId_idx" ON "acciones_correctivas"("hallazgoId");

-- CreateIndex
CREATE INDEX "acciones_correctivas_estado_idx" ON "acciones_correctivas"("estado");

-- CreateIndex
CREATE INDEX "acciones_correctivas_fechaCompromiso_idx" ON "acciones_correctivas"("fechaCompromiso");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "checklists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion_items" ADD CONSTRAINT "inspeccion_items_inspeccionId_fkey" FOREIGN KEY ("inspeccionId") REFERENCES "inspecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion_items" ADD CONSTRAINT "inspeccion_items_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "checklist_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hallazgos" ADD CONSTRAINT "hallazgos_inspeccionId_fkey" FOREIGN KEY ("inspeccionId") REFERENCES "inspecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acciones_correctivas" ADD CONSTRAINT "acciones_correctivas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acciones_correctivas" ADD CONSTRAINT "acciones_correctivas_hallazgoId_fkey" FOREIGN KEY ("hallazgoId") REFERENCES "hallazgos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acciones_correctivas" ADD CONSTRAINT "acciones_correctivas_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acciones_correctivas" ADD CONSTRAINT "acciones_correctivas_creadorId_fkey" FOREIGN KEY ("creadorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

