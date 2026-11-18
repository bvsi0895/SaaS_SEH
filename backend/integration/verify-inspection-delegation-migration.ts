import { strict as assert } from 'node:assert';
import { PrismaClient, EstadoInspeccion, CumplimientoItem, EstadoAccion } from '@prisma/client';

const prisma = new PrismaClient();
const inspectionId = '00000000-0000-0000-0000-000000000605';

async function main() {
  const inspection = await prisma.inspeccion.findUnique({
    where: { id: inspectionId },
    include: { items: true, hallazgos: { include: { accionesCorrectivas: true } } },
  });

  assert.ok(inspection, 'la inspección histórica debe existir');
  assert.equal(inspection.usuarioId, '00000000-0000-0000-0000-000000000602');
  assert.equal(inspection.creadoPorId, '00000000-0000-0000-0000-000000000602');
  assert.equal(inspection.asignadoAId, '00000000-0000-0000-0000-000000000602');
  assert.equal(inspection.estado, EstadoInspeccion.EN_PROGRESO);
  assert.equal(inspection.fechaHoraInicio?.toISOString(), '2026-01-10T10:00:00.000Z');
  assert.equal(inspection.items.length, 1);
  assert.equal(inspection.items[0].cumplimiento, CumplimientoItem.NO_CUMPLE);
  assert.equal(inspection.hallazgos.length, 1);
  assert.equal(inspection.hallazgos[0].accionesCorrectivas.length, 1);
  assert.equal(inspection.hallazgos[0].accionesCorrectivas[0].estado, EstadoAccion.PENDIENTE);
  console.log('Migration preservation passed: owner, state, start date, item, finding, and corrective action retained');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

