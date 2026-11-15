-- Cambia únicamente el valor predeterminado para nuevos ítems.
-- No actualiza filas existentes ni modifica respuestas históricas.
ALTER TABLE "inspeccion_items"
ALTER COLUMN "cumplimiento" SET DEFAULT 'PENDIENTE';
