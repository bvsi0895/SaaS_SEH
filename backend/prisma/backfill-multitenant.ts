import {
  PrismaClient,
  Rol,
  RolOrganizacion,
  TipoOrganizacion,
  EstadoRelacionEmpresa,
} from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function deterministicId(seed: string): string {
  const hex = createHash('sha256').update(seed).digest('hex').slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8).join(''),
    hex.slice(8, 12).join(''),
    hex.slice(12, 16).join(''),
    hex.slice(16, 20).join(''),
    hex.slice(20, 32).join(''),
  ].join('-');
}

function organizationRole(rol: Rol, isFirstAdmin: boolean): RolOrganizacion {
  if (rol === Rol.ADMIN_EMPRESA && isFirstAdmin) return RolOrganizacion.OWNER;
  return RolOrganizacion.AUDITOR_ORGANIZACION;
}

async function main() {
  const empresas = await prisma.empresa.findMany({
    orderBy: { id: 'asc' },
    include: { usuarios: { orderBy: { id: 'asc' } } },
  });

  let membershipsCreated = 0;
  let accessesCreated = 0;
  let organizationsCreated = 0;
  let linksCreated = 0;

  for (const empresa of empresas) {
    const organizationId = deterministicId(`seh:organization:empresa:${empresa.id}`);
    const linkId = deterministicId(`seh:organization-company:${empresa.id}`);
    const establishmentId = deterministicId(`seh:establishment:principal:${empresa.id}`);

    const existingOrganization = await prisma.organizacion.findUnique({ where: { id: organizationId } });
    const organization = await prisma.organizacion.upsert({
      where: { id: organizationId },
      update: { activa: empresa.activa },
      create: {
        id: organizationId,
        nombre: `Espacio inicial - ${empresa.nombre}`,
        tipo: TipoOrganizacion.PYME,
        activa: empresa.activa,
      },
    });
    if (!existingOrganization) organizationsCreated += 1;

    const existingLink = await prisma.organizacionEmpresa.findUnique({ where: { id: linkId } });
    const link = await prisma.organizacionEmpresa.upsert({
      where: { id: linkId },
      update: { estado: empresa.activa ? EstadoRelacionEmpresa.ACTIVA : EstadoRelacionEmpresa.SUSPENDIDA },
      create: {
        id: linkId,
        organizacionId: organization.id,
        empresaId: empresa.id,
        estado: empresa.activa ? EstadoRelacionEmpresa.ACTIVA : EstadoRelacionEmpresa.SUSPENDIDA,
      },
    });
    if (!existingLink) linksCreated += 1;

    await prisma.establecimiento.upsert({
      where: { id: establishmentId },
      update: { activo: empresa.activa },
      create: {
        id: establishmentId,
        empresaId: empresa.id,
        nombre: 'Principal',
        codigo: 'PRINCIPAL',
        activo: empresa.activa,
      },
    });

    const firstAdminId = empresa.usuarios.find((usuario) => usuario.rol === Rol.ADMIN_EMPRESA)?.id;
    for (const usuario of empresa.usuarios) {
      const memberId = deterministicId(`seh:organization-member:${organization.id}:${usuario.id}`);
      const membership = await prisma.organizacionMiembro.upsert({
        where: { id: memberId },
        update: {
          rol: organizationRole(usuario.rol, usuario.id === firstAdminId),
          activa: usuario.activo,
        },
        create: {
          id: memberId,
          organizacionId: organization.id,
          usuarioId: usuario.id,
          rol: organizationRole(usuario.rol, usuario.id === firstAdminId),
          activa: usuario.activo,
        },
      });

      const accessId = deterministicId(`seh:company-access:${link.id}:${membership.id}`);
      await prisma.accesoEmpresa.upsert({
        where: {
          organizacionEmpresaId_organizacionMiembroId: {
            organizacionEmpresaId: link.id,
            organizacionMiembroId: membership.id,
          },
        },
        update: { activo: usuario.activo, rol: usuario.rol },
        create: {
          id: accessId,
          organizacionEmpresaId: link.id,
          organizacionMiembroId: membership.id,
          organizacionId: organization.id,
          empresaId: empresa.id,
          rol: usuario.rol,
          activo: usuario.activo,
        },
      });
      membershipsCreated += 1;
      accessesCreated += 1;
    }

    await prisma.checklist.updateMany({
      where: { empresaId: empresa.id, organizacionEmpresaId: null },
      data: { organizacionEmpresaId: link.id },
    });
    await prisma.inspeccion.updateMany({
      where: { empresaId: empresa.id, organizacionEmpresaId: null },
      data: { organizacionEmpresaId: link.id, establecimientoId: establishmentId },
    });
    await prisma.accionCorrectiva.updateMany({
      where: { empresaId: empresa.id, organizacionEmpresaId: null },
      data: { organizacionEmpresaId: link.id },
    });
  }

  const [checklists, inspecciones, acciones] = await Promise.all([
    prisma.checklist.count({ where: { organizacionEmpresaId: { not: null } } }),
    prisma.inspeccion.count({ where: { organizacionEmpresaId: { not: null } } }),
    prisma.accionCorrectiva.count({ where: { organizacionEmpresaId: { not: null } } }),
  ]);

  console.log(JSON.stringify({
    empresas: empresas.length,
    organizationsProcessed: empresas.length,
    organizationsCreated,
    linksCreated,
    membershipsProcessed: membershipsCreated,
    accessesProcessed: accessesCreated,
    scopedChecklists: checklists,
    scopedInspecciones: inspecciones,
    scopedAcciones: acciones,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('Backfill multiempresa fallido:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
