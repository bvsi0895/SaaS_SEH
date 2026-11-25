-- Los seeds históricos usaban claves de texto para checklists. La API de
-- inspecciones exige UUID v4, por lo que conservamos los registros y sus
-- referencias, pero normalizamos sólo esas claves legacy conocidas.
DO $$
DECLARE
  mapping RECORD;
BEGIN
  -- Nunca sobrescribir un registro existente: si una instalación ya creó el
  -- UUID destino, la migración se detiene de forma atómica para evitar pérdida
  -- o mezcla silenciosa de datos y requiere resolución manual.
  FOR mapping IN
    SELECT * FROM (VALUES
      ('demo-online-checklist-norte', '00000000-0000-4000-8000-000000000101'),
      ('demo-online-checklist-sur', '00000000-0000-4000-8000-000000000102'),
      ('checklist-seguridad-general', '00000000-0000-4000-8000-000000000111'),
      ('checklist-higiene-industrial', '00000000-0000-4000-8000-000000000112'),
      ('checklist-epp', '00000000-0000-4000-8000-000000000113')
    ) AS mappings(legacy_id, uuid_id)
  LOOP
    IF EXISTS (SELECT 1 FROM "checklists" WHERE "id" = mapping.legacy_id)
       AND EXISTS (SELECT 1 FROM "checklists" WHERE "id" = mapping.uuid_id) THEN
      RAISE EXCEPTION 'Colisión de checklist legacy % con UUID destino %', mapping.legacy_id, mapping.uuid_id;
    END IF;
  END LOOP;

  UPDATE "checklists"
  SET "id" = CASE "id"
    WHEN 'demo-online-checklist-norte' THEN '00000000-0000-4000-8000-000000000101'
    WHEN 'demo-online-checklist-sur' THEN '00000000-0000-4000-8000-000000000102'
    WHEN 'checklist-seguridad-general' THEN '00000000-0000-4000-8000-000000000111'
    WHEN 'checklist-higiene-industrial' THEN '00000000-0000-4000-8000-000000000112'
    WHEN 'checklist-epp' THEN '00000000-0000-4000-8000-000000000113'
  END
  WHERE "id" IN (
    'demo-online-checklist-norte',
    'demo-online-checklist-sur',
    'checklist-seguridad-general',
    'checklist-higiene-industrial',
    'checklist-epp'
  );
END $$;
