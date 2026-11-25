import { strict as assert } from 'node:assert';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mappings = [
  ['demo-online-checklist-norte', '00000000-0000-4000-8000-000000000101'],
  ['demo-online-checklist-sur', '00000000-0000-4000-8000-000000000102'],
  ['checklist-seguridad-general', '00000000-0000-4000-8000-000000000111'],
  ['checklist-higiene-industrial', '00000000-0000-4000-8000-000000000112'],
  ['checklist-epp', '00000000-0000-4000-8000-000000000113'],
] as const;

async function main() {
  for (const [legacyId, uuidId] of mappings) {
    assert.equal(await prisma.checklist.count({ where: { id: legacyId } }), 0, `el ID legacy ${legacyId} no debe quedar registrado`);
    assert.equal(await prisma.checklist.count({ where: { id: uuidId } }), 1, `debe existir el UUID ${uuidId}`);
  }

  const checklist = await prisma.checklist.findUniqueOrThrow({
    where: { id: mappings[0][1] },
    include: { items: true },
  });
  assert.equal(checklist.items.length, 1, 'el item del checklist debe conservarse');
  assert.equal(checklist.items[0].id, '00000000-0000-4000-8000-000000000703');

  const inspection = await prisma.inspeccion.findUniqueOrThrow({
    where: { id: '00000000-0000-4000-8000-000000000704' },
    include: { items: true },
  });
  assert.equal(inspection.checklistId, mappings[0][1], 'la inspección histórica debe apuntar al UUID nuevo');
  assert.equal(inspection.items.length, 1, 'la referencia de inspección debe conservarse');
  assert.equal(inspection.items[0].checklistItemId, '00000000-0000-4000-8000-000000000703');
  console.log('Legacy checklist migration passed: five IDs normalized and historical references retained');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
