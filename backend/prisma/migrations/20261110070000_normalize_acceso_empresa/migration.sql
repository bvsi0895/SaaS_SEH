DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "accesos_empresa" WHERE "usuarioId" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'No se puede normalizar AccesoEmpresa: usuarioId contiene datos';
  END IF;
END $$;

ALTER TABLE "accesos_empresa"
  DROP CONSTRAINT "accesos_empresa_usuarioId_fkey";

ALTER TABLE "accesos_empresa"
  DROP COLUMN "usuarioId";
