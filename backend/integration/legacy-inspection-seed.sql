-- Fixture used only by the isolated PostgreSQL migration job.
-- It is inserted before the delegation migration to exercise the real backfill.
INSERT INTO "empresas" ("id", "nombre", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000601', 'Legacy migration company', CURRENT_TIMESTAMP);

INSERT INTO "usuarios" ("id", "email", "password", "nombre", "apellido", "rol", "empresaId", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000602', 'legacy-tech@seh.test', 'fixture', 'Legacy', 'Technician', 'TECNICO', '00000000-0000-0000-0000-000000000601', CURRENT_TIMESTAMP);

INSERT INTO "checklists" ("id", "nombre", "tipo", "empresaId", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000603', 'Legacy checklist', 'GENERAL', '00000000-0000-0000-0000-000000000601', CURRENT_TIMESTAMP);

INSERT INTO "checklist_items" ("id", "descripcion", "orden", "checklistId")
VALUES ('00000000-0000-0000-0000-000000000604', 'Legacy item', 1, '00000000-0000-0000-0000-000000000603');

INSERT INTO "inspecciones" (
  "id", "sector", "descripcion", "fechaHoraInicio", "fechaHoraFin", "estado",
  "createdAt", "updatedAt", "empresaId", "checklistId", "usuarioId"
)
VALUES (
  '00000000-0000-0000-0000-000000000605', 'Legacy sector', 'Created before delegation',
  '2026-01-10T10:00:00.000Z', NULL, 'EN_PROGRESO',
  '2026-01-10T09:00:00.000Z', '2026-01-10T10:00:00.000Z',
  '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000603',
  '00000000-0000-0000-0000-000000000602'
);

INSERT INTO "inspeccion_items" ("id", "cumplimiento", "observacion", "updatedAt", "inspeccionId", "checklistItemId")
VALUES ('00000000-0000-0000-0000-000000000606', 'NO_CUMPLE', 'Legacy answer', CURRENT_TIMESTAMP, '00000000-0000-0000-0000-000000000605', '00000000-0000-0000-0000-000000000604');

INSERT INTO "hallazgos" ("id", "titulo", "descripcion", "nivelRiesgo", "ubicacionTexto", "updatedAt", "inspeccionId")
VALUES ('00000000-0000-0000-0000-000000000607', 'Legacy finding', 'Must survive migration', 'ALTO', 'Legacy sector', CURRENT_TIMESTAMP, '00000000-0000-0000-0000-000000000605');

INSERT INTO "acciones_correctivas" (
  "id", "descripcion", "fechaCompromiso", "estado", "updatedAt", "empresaId", "hallazgoId", "creadorId"
)
VALUES (
  '00000000-0000-0000-0000-000000000608', 'Legacy corrective action', '2026-02-01T00:00:00.000Z',
  'PENDIENTE', CURRENT_TIMESTAMP, '00000000-0000-0000-0000-000000000601',
  '00000000-0000-0000-0000-000000000607', '00000000-0000-0000-0000-000000000602'
);

