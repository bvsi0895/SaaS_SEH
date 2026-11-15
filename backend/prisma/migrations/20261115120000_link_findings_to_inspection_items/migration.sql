ALTER TABLE "hallazgos" ADD COLUMN "inspeccionItemId" TEXT;

CREATE UNIQUE INDEX "hallazgos_inspeccionItemId_key" ON "hallazgos"("inspeccionItemId");

ALTER TABLE "hallazgos"
ADD CONSTRAINT "hallazgos_inspeccionItemId_fkey"
FOREIGN KEY ("inspeccionItemId") REFERENCES "inspeccion_items"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
