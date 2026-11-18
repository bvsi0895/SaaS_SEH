-- Pending inspections have no real start date. Existing timestamps are preserved.
ALTER TABLE "inspecciones"
  ALTER COLUMN "fechaHoraInicio" DROP DEFAULT,
  ALTER COLUMN "fechaHoraInicio" DROP NOT NULL;

