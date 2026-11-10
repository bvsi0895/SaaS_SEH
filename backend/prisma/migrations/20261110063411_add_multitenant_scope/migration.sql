-- CreateEnum
CREATE TYPE "TipoOrganizacion" AS ENUM ('PROFESIONAL_INDEPENDIENTE', 'CONSULTORA', 'PYME');

-- CreateEnum
CREATE TYPE "RolOrganizacion" AS ENUM ('OWNER', 'ADMIN_ORGANIZACION', 'AUDITOR_ORGANIZACION');

-- CreateEnum
CREATE TYPE "EstadoRelacionEmpresa" AS ENUM ('ACTIVA', 'SUSPENDIDA', 'REVOCADA');

-- AlterTable
ALTER TABLE "acciones_correctivas" ADD COLUMN     "organizacionEmpresaId" TEXT;

-- AlterTable
ALTER TABLE "checklists" ADD COLUMN     "organizacionEmpresaId" TEXT;

-- AlterTable
ALTER TABLE "inspecciones" ADD COLUMN     "establecimientoId" TEXT,
ADD COLUMN     "organizacionEmpresaId" TEXT;

-- CreateTable
CREATE TABLE "organizaciones" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoOrganizacion" NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizacion_miembros" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "rol" "RolOrganizacion" NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "organizacion_miembros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizacion_empresas" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "estado" "EstadoRelacionEmpresa" NOT NULL DEFAULT 'ACTIVA',
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizacion_empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "establecimientos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT,
    "direccion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "establecimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accesos_empresa" (
    "id" TEXT NOT NULL,
    "organizacionEmpresaId" TEXT NOT NULL,
    "organizacionMiembroId" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "usuarioId" TEXT,

    CONSTRAINT "accesos_empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accesos_establecimiento" (
    "accesoEmpresaId" TEXT NOT NULL,
    "establecimientoId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "accesos_establecimiento_pkey" PRIMARY KEY ("accesoEmpresaId","establecimientoId")
);

-- CreateIndex
CREATE INDEX "organizaciones_activa_idx" ON "organizaciones"("activa");

-- CreateIndex
CREATE INDEX "organizacion_miembros_usuarioId_activa_idx" ON "organizacion_miembros"("usuarioId", "activa");

-- CreateIndex
CREATE UNIQUE INDEX "organizacion_miembros_organizacionId_usuarioId_key" ON "organizacion_miembros"("organizacionId", "usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "organizacion_miembros_id_organizacionId_key" ON "organizacion_miembros"("id", "organizacionId");

-- CreateIndex
CREATE INDEX "organizacion_empresas_empresaId_estado_idx" ON "organizacion_empresas"("empresaId", "estado");

-- CreateIndex
CREATE INDEX "organizacion_empresas_organizacionId_estado_idx" ON "organizacion_empresas"("organizacionId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "organizacion_empresas_organizacionId_empresaId_key" ON "organizacion_empresas"("organizacionId", "empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "organizacion_empresas_id_organizacionId_empresaId_key" ON "organizacion_empresas"("id", "organizacionId", "empresaId");

-- CreateIndex
CREATE INDEX "establecimientos_empresaId_activo_idx" ON "establecimientos"("empresaId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "establecimientos_empresaId_codigo_key" ON "establecimientos"("empresaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "establecimientos_id_empresaId_key" ON "establecimientos"("id", "empresaId");

-- CreateIndex
CREATE INDEX "accesos_empresa_organizacionMiembroId_activo_idx" ON "accesos_empresa"("organizacionMiembroId", "activo");

-- CreateIndex
CREATE INDEX "accesos_empresa_empresaId_organizacionId_activo_idx" ON "accesos_empresa"("empresaId", "organizacionId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "accesos_empresa_organizacionEmpresaId_organizacionMiembroId_key" ON "accesos_empresa"("organizacionEmpresaId", "organizacionMiembroId");

-- CreateIndex
CREATE INDEX "accesos_establecimiento_establecimientoId_idx" ON "accesos_establecimiento"("establecimientoId");

-- CreateIndex
CREATE INDEX "acciones_correctivas_organizacionEmpresaId_idx" ON "acciones_correctivas"("organizacionEmpresaId");

-- CreateIndex
CREATE INDEX "inspecciones_organizacionEmpresaId_idx" ON "inspecciones"("organizacionEmpresaId");

-- CreateIndex
CREATE INDEX "inspecciones_establecimientoId_idx" ON "inspecciones"("establecimientoId");

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_organizacionEmpresaId_fkey" FOREIGN KEY ("organizacionEmpresaId") REFERENCES "organizacion_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_organizacionEmpresaId_fkey" FOREIGN KEY ("organizacionEmpresaId") REFERENCES "organizacion_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspecciones" ADD CONSTRAINT "inspecciones_establecimientoId_fkey" FOREIGN KEY ("establecimientoId") REFERENCES "establecimientos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acciones_correctivas" ADD CONSTRAINT "acciones_correctivas_organizacionEmpresaId_fkey" FOREIGN KEY ("organizacionEmpresaId") REFERENCES "organizacion_empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizacion_miembros" ADD CONSTRAINT "organizacion_miembros_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizacion_miembros" ADD CONSTRAINT "organizacion_miembros_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizacion_empresas" ADD CONSTRAINT "organizacion_empresas_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizacion_empresas" ADD CONSTRAINT "organizacion_empresas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "establecimientos" ADD CONSTRAINT "establecimientos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accesos_empresa" ADD CONSTRAINT "accesos_empresa_organizacionEmpresaId_organizacionId_empre_fkey" FOREIGN KEY ("organizacionEmpresaId", "organizacionId", "empresaId") REFERENCES "organizacion_empresas"("id", "organizacionId", "empresaId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accesos_empresa" ADD CONSTRAINT "accesos_empresa_organizacionMiembroId_organizacionId_fkey" FOREIGN KEY ("organizacionMiembroId", "organizacionId") REFERENCES "organizacion_miembros"("id", "organizacionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accesos_empresa" ADD CONSTRAINT "accesos_empresa_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accesos_establecimiento" ADD CONSTRAINT "accesos_establecimiento_accesoEmpresaId_fkey" FOREIGN KEY ("accesoEmpresaId") REFERENCES "accesos_empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accesos_establecimiento" ADD CONSTRAINT "accesos_establecimiento_establecimientoId_empresaId_fkey" FOREIGN KEY ("establecimientoId", "empresaId") REFERENCES "establecimientos"("id", "empresaId") ON DELETE RESTRICT ON UPDATE CASCADE;
