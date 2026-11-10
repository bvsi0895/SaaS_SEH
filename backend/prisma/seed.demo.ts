import { PrismaClient, Rol, RolOrganizacion, TipoChecklist, CumplimientoItem, NivelRiesgo, EstadoAccion, EstadoInspeccion, TipoOrganizacion, EstadoRelacionEmpresa } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const password = 'Demo-SEH-2026!';

async function ensureUser(email: string, nombre: string, apellido: string, rol: Rol, empresaId: string) {
  return prisma.usuario.upsert({
    where: { email },
    update: { nombre, apellido, rol, empresaId, activo: true },
    create: { email, nombre, apellido, rol, empresaId, password: await bcrypt.hash(password, 10), activo: true },
  });
}

async function ensureRelation(organizacionId: string, empresaId: string) {
  return prisma.organizacionEmpresa.upsert({
    where: { organizacionId_empresaId: { organizacionId, empresaId } },
    update: { estado: EstadoRelacionEmpresa.ACTIVA },
    create: { organizacionId, empresaId, estado: EstadoRelacionEmpresa.ACTIVA },
  });
}

async function ensureAccess(organizacionId: string, relationId: string, empresaId: string, memberId: string, rol: Rol) {
  return prisma.accesoEmpresa.upsert({
    where: { organizacionEmpresaId_organizacionMiembroId: { organizacionEmpresaId: relationId, organizacionMiembroId: memberId } },
    update: { activo: true, rol },
    create: { organizacionEmpresaId: relationId, organizacionMiembroId: memberId, organizacionId, empresaId, rol, activo: true },
  });
}

async function ensureEstablishment(empresaId: string, codigo: string, nombre: string, direccion: string, sectores: string) {
  return prisma.establecimiento.upsert({
    where: { empresaId_codigo: { empresaId, codigo } },
    update: { nombre, direccion, sectores, activo: true },
    create: { empresaId, codigo, nombre, direccion, sectores, activo: true },
  });
}

async function ensureChecklist(id: string, relationId: string, empresaId: string, nombre: string, tipo: TipoChecklist, descriptions: string[]) {
  const checklist = await prisma.checklist.upsert({
    where: { id },
    update: { nombre, tipo, empresaId, organizacionEmpresaId: relationId, activo: true },
    create: { id, nombre, tipo, empresaId, organizacionEmpresaId: relationId, activo: true },
  });
  for (const [index, descripcion] of descriptions.entries()) {
    const existing = await prisma.checklistItem.findFirst({ where: { checklistId: checklist.id, orden: index + 1 } });
    if (!existing) await prisma.checklistItem.create({ data: { checklistId: checklist.id, orden: index + 1, descripcion, obligatorio: true } });
  }
  return checklist;
}

async function ensureInspection(id: string, relationId: string, empresaId: string, establishmentId: string, checklistId: string, usuarioId: string, sector: string, title: string) {
  const existing = await prisma.inspeccion.findUnique({ where: { id } });
  if (existing) return existing;
  const items = await prisma.checklistItem.findMany({ where: { checklistId }, orderBy: { orden: 'asc' } });
  return prisma.inspeccion.create({
    data: {
      id, empresaId, organizacionEmpresaId: relationId, establecimientoId: establishmentId, checklistId, usuarioId,
      sector, descripcion: title, estado: EstadoInspeccion.COMPLETADA,
      fechaHoraInicio: new Date('2026-10-15T09:00:00Z'), fechaHoraFin: new Date('2026-10-15T10:00:00Z'),
      items: { create: items.map((item, index) => ({ checklistItemId: item.id, cumplimiento: index === 1 ? CumplimientoItem.NO_CUMPLE : CumplimientoItem.CUMPLE })) },
    },
  });
}

async function main() {
  const organizacion = await prisma.organizacion.upsert({
    where: { id: 'demo-online-organizacion' },
    update: { nombre: 'Consultora SEH Demo', tipo: TipoOrganizacion.CONSULTORA, activa: true, emailContacto: 'demo@seh.local', telefono: '+54 11 5555-0100' },
    create: { id: 'demo-online-organizacion', nombre: 'Consultora SEH Demo', tipo: TipoOrganizacion.CONSULTORA, activa: true, emailContacto: 'demo@seh.local', telefono: '+54 11 5555-0100' },
  });

  const companies = await Promise.all([
    prisma.empresa.upsert({ where: { cuit: '30-90000001-1' }, update: { nombre: 'Industria Demo Norte', activa: true }, create: { nombre: 'Industria Demo Norte', cuit: '30-90000001-1', activa: true } }),
    prisma.empresa.upsert({ where: { cuit: '30-90000002-0' }, update: { nombre: 'Logística Demo Sur', activa: true }, create: { nombre: 'Logística Demo Sur', cuit: '30-90000002-0', activa: true } }),
    prisma.empresa.upsert({ where: { cuit: '30-90000003-9' }, update: { nombre: 'Servicios Demo Centro', activa: true }, create: { nombre: 'Servicios Demo Centro', cuit: '30-90000003-9', activa: true } }),
  ]);
  const [companyA, companyB, companyC] = companies;
  const relations = await Promise.all(companies.map((company) => ensureRelation(organizacion.id, company.id)));
  const [relationA, relationB, relationC] = relations;

  const admin = await ensureUser('admin.demo@seh.local', 'Lucía', 'Administradora', Rol.ADMIN_EMPRESA, companyA.id);
  const supervisor = await ensureUser('supervisor.demo@seh.local', 'Martín', 'Supervisor', Rol.SUPERVISOR, companyA.id);
  const technicianA = await ensureUser('tecnico.norte@seh.local', 'Sofía', 'Técnica Norte', Rol.TECNICO, companyA.id);
  const technicianB = await ensureUser('tecnico.sur@seh.local', 'Diego', 'Técnico Sur', Rol.TECNICO, companyB.id);
  const users = [admin, supervisor, technicianA, technicianB];
  const members = await Promise.all(users.map((user, index) => prisma.organizacionMiembro.upsert({
    where: { organizacionId_usuarioId: { organizacionId: organizacion.id, usuarioId: user.id } },
    update: { activa: true, rol: index === 0 ? RolOrganizacion.OWNER : index === 1 ? RolOrganizacion.ADMIN_ORGANIZACION : RolOrganizacion.AUDITOR_ORGANIZACION },
    create: { organizacionId: organizacion.id, usuarioId: user.id, activa: true, rol: index === 0 ? RolOrganizacion.OWNER : index === 1 ? RolOrganizacion.ADMIN_ORGANIZACION : RolOrganizacion.AUDITOR_ORGANIZACION },
  })));
  const [adminMember, supervisorMember, technicianAMember, technicianBMember] = members;

  const adminAccesses = await Promise.all(relations.map((relation, index) => ensureAccess(organizacion.id, relation.id, companies[index].id, adminMember.id, Rol.ADMIN_EMPRESA)));
  await Promise.all(relations.map((relation, index) => ensureAccess(organizacion.id, relation.id, companies[index].id, supervisorMember.id, Rol.SUPERVISOR)));
  const accessA = await ensureAccess(organizacion.id, relationA.id, companyA.id, technicianAMember.id, Rol.TECNICO);
  const accessB = await ensureAccess(organizacion.id, relationB.id, companyB.id, technicianBMember.id, Rol.TECNICO);

  const plantA = await ensureEstablishment(companyA.id, 'NORTE-01', 'Planta Norte', 'Av. Demo 100', 'Producción, Depósito');
  const plantA2 = await ensureEstablishment(companyA.id, 'NORTE-02', 'Depósito Norte', 'Calle Demo 200', 'Logística, Carga');
  const plantB = await ensureEstablishment(companyB.id, 'SUR-01', 'Centro Logístico Sur', 'Ruta Demo km 10', 'Carga, Mantenimiento');
  await ensureEstablishment(companyC.id, 'CENTRO-01', 'Oficinas Centro', 'Diagonal Demo 300', 'Oficinas, Archivo');
  await prisma.accesoEstablecimiento.upsert({ where: { accesoEmpresaId_establecimientoId: { accesoEmpresaId: accessA.id, establecimientoId: plantA.id } }, update: {}, create: { accesoEmpresaId: accessA.id, establecimientoId: plantA.id, empresaId: companyA.id } });
  await prisma.accesoEstablecimiento.upsert({ where: { accesoEmpresaId_establecimientoId: { accesoEmpresaId: accessB.id, establecimientoId: plantB.id } }, update: {}, create: { accesoEmpresaId: accessB.id, establecimientoId: plantB.id, empresaId: companyB.id } });

  const checklistA = await ensureChecklist('demo-online-checklist-norte', relationA.id, companyA.id, 'Checklist Demo de Seguridad', TipoChecklist.GENERAL, ['Extintores vigentes', 'Señalización visible', 'Rutas despejadas']);
  const checklistB = await ensureChecklist('demo-online-checklist-sur', relationB.id, companyB.id, 'Checklist Demo de Logística', TipoChecklist.MAQUINARIA, ['Protecciones de máquinas', 'Orden del sector', 'EPP disponible']);
  const inspectionA = await ensureInspection('demo-online-inspeccion-norte', relationA.id, companyA.id, plantA.id, checklistA.id, technicianA.id, 'Producción', 'Inspección demo de planta norte');
  const inspectionB = await ensureInspection('demo-online-inspeccion-sur', relationB.id, companyB.id, plantB.id, checklistB.id, technicianB.id, 'Carga', 'Inspección demo de centro sur');
  const findingA = await prisma.hallazgo.upsert({ where: { id: 'demo-online-hallazgo-norte' }, update: {}, create: { id: 'demo-online-hallazgo-norte', titulo: 'Señalización demo pendiente', descripcion: 'Hallazgo ficticio para la demostración.', nivelRiesgo: NivelRiesgo.MEDIO, ubicacionTexto: 'Sector producción', inspeccionId: inspectionA.id } });
  const findingB = await prisma.hallazgo.upsert({ where: { id: 'demo-online-hallazgo-sur' }, update: {}, create: { id: 'demo-online-hallazgo-sur', titulo: 'Protección de máquina demo', descripcion: 'Hallazgo ficticio para la demostración.', nivelRiesgo: NivelRiesgo.ALTO, ubicacionTexto: 'Sector carga', inspeccionId: inspectionB.id } });
  await prisma.accionCorrectiva.upsert({ where: { id: 'demo-online-accion-norte' }, update: {}, create: { id: 'demo-online-accion-norte', descripcion: 'Reponer señalización y verificar visibilidad.', fechaCompromiso: new Date('2026-12-15'), estado: EstadoAccion.PENDIENTE, empresaId: companyA.id, organizacionEmpresaId: relationA.id, hallazgoId: findingA.id, creadorId: supervisor.id, responsableId: technicianA.id } });
  await prisma.accionCorrectiva.upsert({ where: { id: 'demo-online-accion-sur' }, update: {}, create: { id: 'demo-online-accion-sur', descripcion: 'Instalar protección y registrar verificación.', fechaCompromiso: new Date('2026-11-30'), estado: EstadoAccion.EN_PROGRESO, empresaId: companyB.id, organizacionEmpresaId: relationB.id, hallazgoId: findingB.id, creadorId: supervisor.id, responsableId: technicianB.id } });

  console.log('Seed demo listo. Usuarios ficticios: admin.demo@seh.local, supervisor.demo@seh.local, tecnico.norte@seh.local y tecnico.sur@seh.local.');
  console.log(`Contextos: ${adminAccesses.length}; empresas: ${companies.length}; establecimientos: ${plantA.id}, ${plantA2.id}, ${plantB.id}.`);
}

main().catch((error) => { console.error('Seed demo falló:', error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
