-- Cada checklist pasa a pertenecer a una consultora, no a una empresa cliente.
-- La resolución es deliberadamente conservadora: cualquier fila sin una única
-- consultora propietaria aborta la migración completa antes de eliminar los
-- campos legacy.
ALTER TABLE "checklists" ADD COLUMN "organizacionId" TEXT;

DO $$
BEGIN
  -- Caso determinista: el vínculo contextual ya identifica la organización.
  UPDATE "checklists" AS checklist
  SET "organizacionId" = relation."organizacionId"
  FROM "organizacion_empresas" AS relation
  WHERE checklist."organizacionEmpresaId" = relation."id";

  -- Caso legacy sin vínculo contextual: sólo aceptar una única organización
  -- asociada a la empresa. Si hay cero o varias, queda NULL y se aborta.
  UPDATE "checklists" AS checklist
  SET "organizacionId" = candidate."organizacionId"
  FROM (
    SELECT checklist."id", MIN(relation."organizacionId") AS "organizacionId"
    FROM "checklists" AS checklist
    JOIN "organizacion_empresas" AS relation
      ON relation."empresaId" = checklist."empresaId"
    WHERE checklist."organizacionId" IS NULL
      AND checklist."organizacionEmpresaId" IS NULL
    GROUP BY checklist."id"
    HAVING COUNT(DISTINCT relation."organizacionId") = 1
  ) AS candidate
  WHERE checklist."id" = candidate."id";

  IF EXISTS (SELECT 1 FROM "checklists" WHERE "organizacionId" IS NULL) THEN
    RAISE EXCEPTION 'No se puede determinar de forma segura la consultora propietaria de uno o más checklists: %',
      (SELECT string_agg("id", ', ' ORDER BY "id") FROM "checklists" WHERE "organizacionId" IS NULL);
  END IF;
END $$;

ALTER TABLE "checklists" DROP CONSTRAINT "checklists_empresaId_fkey";
ALTER TABLE "checklists" DROP CONSTRAINT "checklists_organizacionEmpresaId_fkey";
DROP INDEX IF EXISTS "checklists_empresaId_idx";

ALTER TABLE "checklists" ALTER COLUMN "organizacionId" SET NOT NULL;
ALTER TABLE "checklists" DROP COLUMN "empresaId";
ALTER TABLE "checklists" DROP COLUMN "organizacionEmpresaId";

ALTER TABLE "checklists"
  ADD CONSTRAINT "checklists_organizacionId_fkey"
  FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "checklists_organizacionId_idx" ON "checklists"("organizacionId");
