-- Fixture for the isolated migration safety test.
-- The same client company is served by two consultoras, while the legacy
-- checklist has no contextual organization link. The migration must abort.
INSERT INTO "empresas" ("id", "nombre", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000801', 'Ambiguous ownership company', CURRENT_TIMESTAMP);

INSERT INTO "organizaciones" ("id", "nombre", "tipo", "actualizadaEn")
VALUES
  ('00000000-0000-4000-8000-000000000802', 'Ambiguous consultancy A', 'CONSULTORA', CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000803', 'Ambiguous consultancy B', 'CONSULTORA', CURRENT_TIMESTAMP);

INSERT INTO "organizacion_empresas" ("id", "organizacionId", "empresaId", "actualizadaEn")
VALUES
  ('00000000-0000-4000-8000-000000000804', '00000000-0000-4000-8000-000000000802', '00000000-0000-4000-8000-000000000801', CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000805', '00000000-0000-4000-8000-000000000803', '00000000-0000-4000-8000-000000000801', CURRENT_TIMESTAMP);

INSERT INTO "checklists" ("id", "nombre", "tipo", "empresaId", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000806', 'Checklist con propiedad ambigua', 'GENERAL', '00000000-0000-4000-8000-000000000801', CURRENT_TIMESTAMP);
