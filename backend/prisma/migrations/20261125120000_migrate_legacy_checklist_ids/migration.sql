-- Los seeds históricos usaban claves de texto para checklists. La API de
-- inspecciones exige UUID v4, por lo que conservamos los registros y sus
-- referencias, pero normalizamos sólo esas claves legacy conocidas.
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
