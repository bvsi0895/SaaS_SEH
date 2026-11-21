ALTER TABLE "hallazgos"
  ADD COLUMN "responsableResolucionTexto" TEXT,
  ADD COLUMN "responsableResolucionCargo" TEXT;

ALTER TABLE "hallazgos_historial"
  ADD COLUMN "responsableTexto" TEXT,
  ADD COLUMN "responsableCargo" TEXT;
