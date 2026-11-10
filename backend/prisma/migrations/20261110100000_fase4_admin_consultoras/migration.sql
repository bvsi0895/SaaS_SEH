ALTER TABLE "organizaciones"
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "emailContacto" TEXT,
  ADD COLUMN "telefono" TEXT,
  ADD COLUMN "direccion" TEXT;

ALTER TABLE "establecimientos"
  ADD COLUMN "sectores" TEXT;
