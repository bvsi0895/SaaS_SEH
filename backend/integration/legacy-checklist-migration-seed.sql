-- Fixture for the isolated PostgreSQL migration test. It represents the five
-- legacy checklist IDs plus one historical inspection and its item reference.
INSERT INTO "empresas" ("id", "nombre", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000701', 'Legacy checklist migration company', CURRENT_TIMESTAMP);

INSERT INTO "organizaciones" ("id", "nombre", "tipo", "actualizadaEn")
VALUES ('00000000-0000-4000-8000-000000000706', 'Legacy checklist migration consultancy', 'CONSULTORA', CURRENT_TIMESTAMP);

INSERT INTO "organizacion_empresas" ("id", "organizacionId", "empresaId", "actualizadaEn")
VALUES ('00000000-0000-4000-8000-000000000707', '00000000-0000-4000-8000-000000000706', '00000000-0000-4000-8000-000000000701', CURRENT_TIMESTAMP);

INSERT INTO "usuarios" ("id", "email", "password", "nombre", "apellido", "rol", "empresaId", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000702', 'legacy-checklist-migration@seh.test', 'fixture', 'Legacy', 'Checklist', 'TECNICO', '00000000-0000-4000-8000-000000000701', CURRENT_TIMESTAMP);

INSERT INTO "checklists" ("id", "nombre", "tipo", "empresaId", "organizacionEmpresaId", "updatedAt")
VALUES
  ('demo-online-checklist-norte', 'Demo Norte legacy', 'GENERAL', '00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000707', CURRENT_TIMESTAMP),
  ('demo-online-checklist-sur', 'Demo Sur legacy', 'MAQUINARIA', '00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000707', CURRENT_TIMESTAMP),
  ('checklist-seguridad-general', 'Seguridad legacy', 'GENERAL', '00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000707', CURRENT_TIMESTAMP),
  ('checklist-higiene-industrial', 'Higiene legacy', 'ORDEN_LIMPIEZA', '00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000707', CURRENT_TIMESTAMP),
  ('checklist-epp', 'EPP legacy', 'EPP', '00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000707', CURRENT_TIMESTAMP);

INSERT INTO "checklist_items" ("id", "descripcion", "orden", "checklistId")
VALUES ('00000000-0000-4000-8000-000000000703', 'Item histórico', 1, 'demo-online-checklist-norte');

INSERT INTO "inspecciones" (
  "id", "sector", "descripcion", "estado", "createdAt", "updatedAt",
  "empresaId", "checklistId", "creadoPorId", "asignadoAId", "usuarioId"
)
VALUES (
  '00000000-0000-4000-8000-000000000704', 'Sector histórico', 'Debe conservar referencias', 'EN_PROGRESO',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '00000000-0000-4000-8000-000000000701',
  'demo-online-checklist-norte', '00000000-0000-4000-8000-000000000702',
  '00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000702'
);

INSERT INTO "inspeccion_items" ("id", "cumplimiento", "updatedAt", "inspeccionId", "checklistItemId")
VALUES (
  '00000000-0000-4000-8000-000000000705', 'PENDIENTE', CURRENT_TIMESTAMP,
  '00000000-0000-4000-8000-000000000704', '00000000-0000-4000-8000-000000000703'
);
