import { PrismaClient, EstadoInspeccion, TipoChecklist, Rol } from '@prisma/client';
import { randomUUID } from 'crypto';
import { InspeccionesService } from '../src/inspecciones/inspecciones.service';

const prisma = new PrismaClient();
const ROLLBACK = 'MULTITENANT_ISOLATION_ROLLBACK';

async function main() {
  const empresas = await prisma.empresa.findMany({
    orderBy: { id: 'asc' },
    include: { usuarios: { orderBy: { id: 'asc' }, take: 2 } },
  });
  const empresa = empresas.find((candidate) => candidate.usuarios.length >= 2);
  const usuarios = empresa?.usuarios ?? [];

  if (!empresa || usuarios.length < 2) {
    throw new Error('Se requieren una empresa y dos usuarios de desarrollo para la verificación');
  }

  try {
    await prisma.$transaction(async (tx) => {
      const organizationA = await tx.organizacion.create({
        data: { id: randomUUID(), nombre: 'Consultora A - prueba', tipo: 'CONSULTORA' },
      });
      const organizationB = await tx.organizacion.create({
        data: { id: randomUUID(), nombre: 'Consultora B - prueba', tipo: 'CONSULTORA' },
      });
      const linkA = await tx.organizacionEmpresa.create({
        data: { id: randomUUID(), organizacionId: organizationA.id, empresaId: empresa.id },
      });
      const linkB = await tx.organizacionEmpresa.create({
        data: { id: randomUUID(), organizacionId: organizationB.id, empresaId: empresa.id },
      });
      const memberA = await tx.organizacionMiembro.create({
        data: { id: randomUUID(), organizacionId: organizationA.id, usuarioId: usuarios[0].id, rol: 'AUDITOR_ORGANIZACION' },
      });
      const memberB = await tx.organizacionMiembro.create({
        data: { id: randomUUID(), organizacionId: organizationB.id, usuarioId: usuarios[1].id, rol: 'AUDITOR_ORGANIZACION' },
      });
      await tx.accesoEmpresa.create({
        data: {
          id: randomUUID(), organizacionEmpresaId: linkA.id, organizacionMiembroId: memberA.id,
          organizacionId: organizationA.id, empresaId: empresa.id, rol: Rol.TECNICO,
        },
      });
      await tx.accesoEmpresa.create({
        data: {
          id: randomUUID(), organizacionEmpresaId: linkB.id, organizacionMiembroId: memberB.id,
          organizacionId: organizationB.id, empresaId: empresa.id, rol: Rol.TECNICO,
        },
      });
      const checklistA = await tx.checklist.create({
        data: { id: randomUUID(), nombre: 'Checklist prueba A', tipo: TipoChecklist.GENERAL, empresaId: empresa.id, organizacionEmpresaId: linkA.id },
      });
      const checklistB = await tx.checklist.create({
        data: { id: randomUUID(), nombre: 'Checklist prueba B', tipo: TipoChecklist.GENERAL, empresaId: empresa.id, organizacionEmpresaId: linkB.id },
      });
      await tx.inspeccion.create({
        data: { id: randomUUID(), sector: 'Sector A', empresaId: empresa.id, organizacionEmpresaId: linkA.id, usuarioId: usuarios[0].id, checklistId: checklistA.id, estado: EstadoInspeccion.EN_PROGRESO },
      });
      await tx.inspeccion.create({
        data: { id: randomUUID(), sector: 'Sector B', empresaId: empresa.id, organizacionEmpresaId: linkB.id, usuarioId: usuarios[1].id, checklistId: checklistB.id, estado: EstadoInspeccion.EN_PROGRESO },
      });

      const service = new InspeccionesService(tx as never);
      const visibleA = await service.findAll(empresa.id, undefined, linkA.id);
      const visibleB = await service.findAll(empresa.id, undefined, linkB.id);
      if (visibleA.length !== 1 || visibleA[0].organizacionEmpresaId !== linkA.id) throw new Error('La consultora A recibió un expediente incorrecto');
      if (visibleB.length !== 1 || visibleB[0].organizacionEmpresaId !== linkB.id) throw new Error('La consultora B recibió un expediente incorrecto');
      if (visibleA.some((item) => item.organizacionEmpresaId === linkB.id) || visibleB.some((item) => item.organizacionEmpresaId === linkA.id)) {
        throw new Error('Se detectó acceso cruzado entre vínculos');
      }
      throw new Error(ROLLBACK);
    });
  } catch (error) {
    if (error instanceof Error && error.message === ROLLBACK) {
      console.log('OK: dos consultoras comparten empresa y mantienen expedientes aislados; transacción revertida.');
      return;
    }
    throw error;
  }
}

main().catch((error) => {
  console.error('Verificación de aislamiento fallida:', error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
