import { strict as assert } from 'node:assert';
import { rm } from 'fs/promises';
import { PrismaClient, Rol, RolOrganizacion, TipoOrganizacion, EstadoRelacionEmpresa, EstadoInspeccion, CumplimientoItem, NivelRiesgo } from '@prisma/client';
const sharp = require('sharp') as any;
import { InspeccionesService } from '../src/inspecciones/inspecciones.service';
import { HallazgosService } from '../src/hallazgos/hallazgos.service';
import { AccionesCorrectivasService } from '../src/acciones-correctivas/acciones-correctivas.service';
import { TenancyService } from '../src/tenancy/tenancy.service';

const prisma = new PrismaClient();
const tenancy = new TenancyService(prisma as never);
const inspections = new InspeccionesService(prisma as never, tenancy);
const findings = new HallazgosService(prisma as never, tenancy);
const actions = new AccionesCorrectivasService(prisma as never, tenancy);
const uploadDir = '.test-uploads-checklist';

const ids = {
  empresa: '00000000-0000-0000-0000-000000000701',
  organizacion: '00000000-0000-0000-0000-000000000702',
  contexto: '00000000-0000-0000-0000-000000000703',
  tecnico: '00000000-0000-0000-0000-000000000704',
  otroTecnico: '00000000-0000-0000-0000-000000000705',
  miembro: '00000000-0000-0000-0000-000000000706',
  acceso: '00000000-0000-0000-0000-000000000707',
  checklist: '00000000-0000-0000-0000-000000000708',
  checklistItem: '00000000-0000-0000-0000-000000000709',
  inspeccion: '00000000-0000-0000-0000-000000000710',
  establecimiento: '00000000-0000-0000-0000-000000000711',
};

async function cleanup() {
  await prisma.accionCorrectiva.deleteMany({ where: { hallazgo: { inspeccionId: ids.inspeccion } } });
  await prisma.hallazgo.deleteMany({ where: { inspeccionId: ids.inspeccion } });
  await prisma.inspeccion.deleteMany({ where: { id: ids.inspeccion } });
  await prisma.checklistItem.deleteMany({ where: { id: ids.checklistItem } });
  await prisma.checklist.deleteMany({ where: { id: ids.checklist } });
  await prisma.accesoEstablecimiento.deleteMany({ where: { accesoEmpresaId: ids.acceso, establecimientoId: ids.establecimiento } });
  await prisma.establecimiento.deleteMany({ where: { id: ids.establecimiento } });
  await prisma.accesoEmpresa.deleteMany({ where: { id: ids.acceso } });
  await prisma.organizacionMiembro.deleteMany({ where: { id: ids.miembro } });
  await prisma.usuario.deleteMany({ where: { id: { in: [ids.tecnico, ids.otroTecnico] } } });
  await prisma.organizacionEmpresa.deleteMany({ where: { id: ids.contexto } });
  await prisma.organizacion.deleteMany({ where: { id: ids.organizacion } });
  await prisma.empresa.deleteMany({ where: { id: ids.empresa } });
  await rm(uploadDir, { recursive: true, force: true });
}

async function main() {
  process.env.UPLOAD_DIR = uploadDir;
  await cleanup();
  try {
    await prisma.empresa.create({ data: { id: ids.empresa, nombre: 'Checklist findings test company' } });
    await prisma.organizacion.create({ data: { id: ids.organizacion, nombre: 'Checklist findings test organization', tipo: TipoOrganizacion.CONSULTORA } });
    await prisma.organizacionEmpresa.create({ data: { id: ids.contexto, organizacionId: ids.organizacion, empresaId: ids.empresa, estado: EstadoRelacionEmpresa.ACTIVA } });
    await prisma.usuario.createMany({ data: [
      { id: ids.tecnico, email: 'checklist-findings-tech@seh.test', password: 'hash', nombre: 'Técnico', apellido: 'Asignado', rol: Rol.TECNICO, empresaId: ids.empresa },
      { id: ids.otroTecnico, email: 'checklist-findings-other@seh.test', password: 'hash', nombre: 'Técnico', apellido: 'No asignado', rol: Rol.TECNICO, empresaId: ids.empresa },
    ] });
    await prisma.organizacionMiembro.create({ data: { id: ids.miembro, organizacionId: ids.organizacion, usuarioId: ids.tecnico, rol: RolOrganizacion.AUDITOR_ORGANIZACION } });
    await prisma.accesoEmpresa.create({ data: { id: ids.acceso, organizacionEmpresaId: ids.contexto, organizacionMiembroId: ids.miembro, organizacionId: ids.organizacion, empresaId: ids.empresa, rol: Rol.TECNICO } });
    await prisma.establecimiento.create({ data: { id: ids.establecimiento, empresaId: ids.empresa, nombre: 'Checklist findings site' } });
    await prisma.accesoEstablecimiento.create({ data: { accesoEmpresaId: ids.acceso, establecimientoId: ids.establecimiento, empresaId: ids.empresa } });
    await prisma.checklist.create({ data: { id: ids.checklist, nombre: 'Checklist de hallazgos', empresaId: ids.empresa, organizacionEmpresaId: ids.contexto, items: { create: { id: ids.checklistItem, descripcion: 'Salida de emergencia despejada', orden: 1 } } } });
    await prisma.inspeccion.create({
      data: {
        id: ids.inspeccion,
        sector: 'Sector de prueba',
        estado: EstadoInspeccion.EN_PROGRESO,
        fechaHoraInicio: new Date(),
        empresaId: ids.empresa,
        organizacionEmpresaId: ids.contexto,
        establecimientoId: ids.establecimiento,
        checklistId: ids.checklist,
        creadoPorId: ids.tecnico,
        asignadoAId: ids.tecnico,
        usuarioId: ids.tecnico,
        items: { create: { id: ids.checklistItem, checklistItemId: ids.checklistItem } },
      },
    });

    // 1, 3: marcar No cumple repetidamente y crear el hallazgo una sola vez.
    await inspections.registrarItem(
      ids.inspeccion,
      { inspeccionItemId: ids.checklistItem, cumplimiento: CumplimientoItem.NO_CUMPLE },
      ids.empresa,
      ids.contexto,
      ids.tecnico,
      Rol.TECNICO,
      ids.acceso,
    );
    const created = await findings.create({
      inspeccionId: ids.inspeccion,
      inspeccionItemId: ids.checklistItem,
      titulo: 'Salida bloqueada',
      descripcion: 'La salida de emergencia está bloqueada',
      nivelRiesgo: NivelRiesgo.ALTO,
      ubicacionTexto: 'Sector de prueba',
    }, ids.empresa, ids.contexto, ids.tecnico, ids.acceso);
    assert.equal(created.inspeccionItemId, ids.checklistItem);

    await inspections.registrarItem(
      ids.inspeccion,
      { inspeccionItemId: ids.checklistItem, cumplimiento: CumplimientoItem.NO_CUMPLE },
      ids.empresa,
      ids.contexto,
      ids.tecnico,
      Rol.TECNICO,
      ids.acceso,
    );
    await findings.create({
      inspeccionId: ids.inspeccion,
      inspeccionItemId: ids.checklistItem,
      titulo: 'Salida bloqueada actualizada',
      descripcion: 'La salida de emergencia continúa bloqueada',
      nivelRiesgo: NivelRiesgo.CRITICO,
      ubicacionTexto: 'Sector de prueba actualizado',
    }, ids.empresa, ids.contexto, ids.tecnico, ids.acceso);

    // 2, 4: editar el hallazgo existente desde el flujo del checklist.
    const edited = await findings.update(created.id, {
      titulo: 'Salida corregida en edición',
      descripcion: 'La descripción fue corregida desde el checklist',
      nivelRiesgo: NivelRiesgo.MEDIO,
      ubicacionTexto: 'Sector de prueba corregido',
    }, ids.empresa, ids.contexto, ids.tecnico, ids.acceso);
    assert.equal(edited.id, created.id);
    assert.equal(edited.titulo, 'Salida corregida en edición');

    // 5: guardar el hallazgo existente con una fotografía nueva.
    const jpeg = await sharp({ create: { width: 40, height: 30, channels: 3, background: 'orange' } }).jpeg().toBuffer();
    const withPhoto = await findings.addPhoto(created.id, ids.empresa, { buffer: jpeg, originalname: 'evidencia.jpg' }, ids.contexto, ids.tecnico, ids.acceso);
    assert.equal(JSON.parse(withPhoto.fotosUrls || '[]').length, 1);

    // 6: el vínculo único evita duplicados aunque se repita el flujo.
    assert.equal(await prisma.hallazgo.count({ where: { inspeccionItemId: ids.checklistItem } }), 1);

    // 7: el técnico asignado conserva sus permisos; otro técnico no puede editar.
    await assert.rejects(
      findings.update(created.id, { titulo: 'Cambio no autorizado' }, ids.empresa, ids.contexto, ids.otroTecnico),
      /hallazgo no encontrado/i,
    );

    // La acción correctiva continúa vinculada al mismo hallazgo y es editable.
    const action = await actions.create({
      hallazgoId: created.id,
      descripcion: 'Despejar la salida y verificar señalización',
      fechaCompromiso: '2026-12-01',
    }, ids.tecnico, ids.empresa, ids.contexto);
    await actions.update(action.id, { descripcion: 'Despejar la salida y verificar señalización actualizada' }, ids.empresa, ids.contexto);
    assert.equal(await prisma.accionCorrectiva.count({ where: { hallazgoId: created.id } }), 1);

    // 8: un vínculo inexistente falla antes de persistir y deja el hallazgo único intacto.
    await assert.rejects(
      findings.create({
        inspeccionId: ids.inspeccion,
        inspeccionItemId: '00000000-0000-0000-0000-000000000799',
        titulo: 'Hallazgo inválido',
        descripcion: 'Este hallazgo no debe persistirse',
        nivelRiesgo: NivelRiesgo.BAJO,
        ubicacionTexto: 'Sector de prueba',
    }, ids.empresa, ids.contexto, ids.tecnico, ids.acceso),
      /ítem no pertenece/i,
    );
    assert.equal(await prisma.hallazgo.count({ where: { inspeccionItemId: ids.checklistItem } }), 1);
    console.log('Checklist finding PostgreSQL integration passed: create, repeat No cumple, edit, photo, action, authorization, and no duplicates');
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
