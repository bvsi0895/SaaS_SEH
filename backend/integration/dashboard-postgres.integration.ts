import { strict as assert } from 'node:assert';
import {
  PrismaClient,
  CumplimientoItem,
  EstadoAccion,
  EstadoInspeccion,
  EstadoRelacionEmpresa,
  NivelRiesgo,
  EstadoHallazgo,
  Rol,
  RolOrganizacion,
  TipoChecklist,
  TipoOrganizacion,
} from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { DashboardService } from '../src/dashboard/dashboard.service';

const prisma = new PrismaClient();
const dashboard = new DashboardService(prisma as never);
const ids = {
  empresa: '00000000-0000-0000-0000-000000001701',
  empresaB: '00000000-0000-0000-0000-000000001702',
  empresaVacia: '00000000-0000-0000-0000-000000001703',
  organizacion: '00000000-0000-0000-0000-000000001704',
  organizacionB: '00000000-0000-0000-0000-000000001743',
  relacion: '00000000-0000-0000-0000-000000001705',
  relacionB: '00000000-0000-0000-0000-000000001744',
  membresia: '00000000-0000-0000-0000-000000001706',
  acceso: '00000000-0000-0000-0000-000000001707',
  admin: '00000000-0000-0000-0000-000000001708',
  supervisor: '00000000-0000-0000-0000-000000001709',
  tecnico: '00000000-0000-0000-0000-000000001710',
  usuarioOtro: '00000000-0000-0000-0000-000000001711',
  usuarioB: '00000000-0000-0000-0000-000000001712',
  checklist: '00000000-0000-0000-0000-000000001713',
  checklistB: '00000000-0000-0000-0000-000000001714',
  estA1: '00000000-0000-0000-0000-000000001715',
  estA2: '00000000-0000-0000-0000-000000001716',
  estB1: '00000000-0000-0000-0000-000000001717',
  insStarted: '00000000-0000-0000-0000-000000001718',
  insCompleted: '00000000-0000-0000-0000-000000001719',
  insPending: '00000000-0000-0000-0000-000000001720',
  insOther: '00000000-0000-0000-0000-000000001721',
  insA2: '00000000-0000-0000-0000-000000001722',
  insPrevious: '00000000-0000-0000-0000-000000001723',
  insB: '00000000-0000-0000-0000-000000001724',
  insOtherOrg: '00000000-0000-0000-0000-000000001745',
  h1: '00000000-0000-0000-0000-000000001725',
  h2: '00000000-0000-0000-0000-000000001726',
  h3: '00000000-0000-0000-0000-000000001727',
  h4: '00000000-0000-0000-0000-000000001728',
  h5: '00000000-0000-0000-0000-000000001729',
  h6: '00000000-0000-0000-0000-000000001730',
  hPrev: '00000000-0000-0000-0000-000000001731',
  hB: '00000000-0000-0000-0000-000000001732',
  hOtherOrg: '00000000-0000-0000-0000-000000001746',
  a2: '00000000-0000-0000-0000-000000001733',
  a3: '00000000-0000-0000-0000-000000001734',
  a4: '00000000-0000-0000-0000-000000001735',
  a5: '00000000-0000-0000-0000-000000001736',
  aPrev: '00000000-0000-0000-0000-000000001737',
  a6: '00000000-0000-0000-0000-000000001742',
  a7: '00000000-0000-0000-0000-000000001747',
  item1: '00000000-0000-0000-0000-000000001738',
  item2: '00000000-0000-0000-0000-000000001739',
  item3: '00000000-0000-0000-0000-000000001740',
  itemB: '00000000-0000-0000-0000-000000001741',
} as const;

const current = new Date();
const currentDate = new Date(
  Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 10, 12),
);
const previousDate = new Date(
  Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 1, 10, 12),
);
const pastDue = new Date(currentDate.getTime() - 3 * 86400000);
const futureDue = new Date(currentDate.getTime() + 30 * 86400000);

async function cleanup() {
  const actionIds = [ids.a2, ids.a3, ids.a4, ids.a5, ids.aPrev, ids.a6, ids.a7];
  const findingIds = [
    ids.h1,
    ids.h2,
    ids.h3,
    ids.h4,
    ids.h5,
    ids.h6,
    ids.hPrev,
    ids.hB,
    ids.hOtherOrg,
  ];
  const inspectionIds = [
    ids.insStarted,
    ids.insCompleted,
    ids.insPending,
    ids.insOther,
    ids.insA2,
    ids.insPrevious,
    ids.insB,
    ids.insOtherOrg,
  ];
  await prisma.accionCorrectiva.deleteMany({
    where: { id: { in: actionIds } },
  });
  await prisma.hallazgo.deleteMany({ where: { id: { in: findingIds } } });
  await prisma.inspeccionItem.deleteMany({
    where: { inspeccionId: { in: inspectionIds } },
  });
  await prisma.inspeccion.deleteMany({ where: { id: { in: inspectionIds } } });
  await prisma.checklistItem.deleteMany({
    where: { id: { in: [ids.item1, ids.item2, ids.item3, ids.itemB] } },
  });
  await prisma.checklist.deleteMany({
    where: { id: { in: [ids.checklist, ids.checklistB] } },
  });
  await prisma.accesoEstablecimiento.deleteMany({
    where: { accesoEmpresaId: ids.acceso },
  });
  await prisma.accesoEmpresa.deleteMany({ where: { id: ids.acceso } });
  await prisma.organizacionMiembro.deleteMany({ where: { id: ids.membresia } });
  await prisma.usuario.deleteMany({
    where: {
      id: {
        in: [
          ids.admin,
          ids.supervisor,
          ids.tecnico,
          ids.usuarioOtro,
          ids.usuarioB,
        ],
      },
    },
  });
  await prisma.establecimiento.deleteMany({
    where: { id: { in: [ids.estA1, ids.estA2, ids.estB1] } },
  });
  await prisma.organizacionEmpresa.deleteMany({
    where: { id: { in: [ids.relacion, ids.relacionB] } },
  });
  await prisma.organizacion.deleteMany({
    where: { id: { in: [ids.organizacion, ids.organizacionB] } },
  });
  await prisma.empresa.deleteMany({
    where: { id: { in: [ids.empresa, ids.empresaB, ids.empresaVacia] } },
  });
}

async function createInspection(
  id: string,
  data: {
    sector: string;
    assignedTo: string;
    establishmentId: string;
    state: EstadoInspeccion;
    startedAt: Date | null;
    createdAt: Date;
  },
  statuses: CumplimientoItem[],
) {
  await prisma.inspeccion.create({
    data: {
      id,
      sector: data.sector,
      empresaId: ids.empresa,
      organizacionEmpresaId: ids.relacion,
      establecimientoId: data.establishmentId,
      checklistId: ids.checklist,
      creadoPorId: ids.admin,
      asignadoAId: data.assignedTo,
      usuarioId: data.assignedTo,
      estado: data.state,
      fechaHoraInicio: data.startedAt,
      createdAt: data.createdAt,
      items: {
        create: statuses.map((cumplimiento, index) => ({
          checklistItemId: [ids.item1, ids.item2, ids.item3][index],
          cumplimiento,
        })),
      },
    },
  });
}

async function main() {
  await cleanup();
  try {
    await prisma.empresa.createMany({
      data: [
        { id: ids.empresa, nombre: 'Dashboard test company' },
        { id: ids.empresaB, nombre: 'Dashboard other company' },
        { id: ids.empresaVacia, nombre: 'Dashboard empty company' },
      ],
    });
    await prisma.organizacion.createMany({
      data: [
        {
          id: ids.organizacion,
          nombre: 'Dashboard organization',
          tipo: TipoOrganizacion.CONSULTORA,
        },
        {
          id: ids.organizacionB,
          nombre: 'Dashboard other organization',
          tipo: TipoOrganizacion.CONSULTORA,
        },
      ],
    });
    await prisma.organizacionEmpresa.create({
      data: {
        id: ids.relacion,
        organizacionId: ids.organizacion,
        empresaId: ids.empresa,
        estado: EstadoRelacionEmpresa.ACTIVA,
      },
    });
    await prisma.organizacionEmpresa.create({
      data: {
        id: ids.relacionB,
        organizacionId: ids.organizacionB,
        empresaId: ids.empresa,
        estado: EstadoRelacionEmpresa.ACTIVA,
      },
    });
    await prisma.establecimiento.createMany({
      data: [
        {
          id: ids.estA1,
          empresaId: ids.empresa,
          nombre: 'Planta autorizada',
          codigo: 'A1',
        },
        {
          id: ids.estA2,
          empresaId: ids.empresa,
          nombre: 'Planta no autorizada',
          codigo: 'A2',
        },
        {
          id: ids.estB1,
          empresaId: ids.empresaB,
          nombre: 'Otra empresa',
          codigo: 'B1',
        },
      ],
    });
    await prisma.usuario.createMany({
      data: [
        {
          id: ids.admin,
          email: 'dashboard-admin@seh.test',
          password: 'hash',
          nombre: 'Admin',
          apellido: 'Dashboard',
          rol: Rol.ADMIN_EMPRESA,
          empresaId: ids.empresa,
        },
        {
          id: ids.supervisor,
          email: 'dashboard-supervisor@seh.test',
          password: 'hash',
          nombre: 'Supervisor',
          apellido: 'Dashboard',
          rol: Rol.SUPERVISOR,
          empresaId: ids.empresa,
        },
        {
          id: ids.tecnico,
          email: 'dashboard-tech@seh.test',
          password: 'hash',
          nombre: 'Técnico',
          apellido: 'Dashboard',
          rol: Rol.TECNICO,
          empresaId: ids.empresa,
        },
        {
          id: ids.usuarioOtro,
          email: 'dashboard-other@seh.test',
          password: 'hash',
          nombre: 'Otro',
          apellido: 'Usuario',
          rol: Rol.TECNICO,
          empresaId: ids.empresa,
        },
        {
          id: ids.usuarioB,
          email: 'dashboard-b@seh.test',
          password: 'hash',
          nombre: 'Usuario',
          apellido: 'B',
          rol: Rol.TECNICO,
          empresaId: ids.empresaB,
        },
      ],
    });
    await prisma.organizacionMiembro.create({
      data: {
        id: ids.membresia,
        organizacionId: ids.organizacion,
        usuarioId: ids.tecnico,
        rol: RolOrganizacion.AUDITOR_ORGANIZACION,
      },
    });
    await prisma.accesoEmpresa.create({
      data: {
        id: ids.acceso,
        organizacionEmpresaId: ids.relacion,
        organizacionMiembroId: ids.membresia,
        organizacionId: ids.organizacion,
        empresaId: ids.empresa,
        rol: Rol.TECNICO,
        establecimientos: {
          create: { establecimientoId: ids.estA1, empresaId: ids.empresa },
        },
      },
    });
    await prisma.checklist.create({
      data: {
        id: ids.checklist,
        nombre: 'Dashboard checklist',
        tipo: TipoChecklist.GENERAL,
        organizacionId: ids.organizacion,
        items: {
          create: [
            { id: ids.item1, descripcion: 'Item uno', orden: 1 },
            { id: ids.item2, descripcion: 'Item dos', orden: 2 },
            { id: ids.item3, descripcion: 'Item tres', orden: 3 },
          ],
        },
      },
    });
    await prisma.checklist.create({
      data: {
        id: ids.checklistB,
        nombre: 'Dashboard checklist B',
        organizacionId: ids.organizacion,
        items: { create: { id: ids.itemB, descripcion: 'Item B', orden: 1 } },
      },
    });

    await createInspection(
      ids.insStarted,
      {
        sector: 'Producción',
        assignedTo: ids.tecnico,
        establishmentId: ids.estA1,
        state: EstadoInspeccion.EN_PROGRESO,
        startedAt: currentDate,
        createdAt: currentDate,
      },
      [
        CumplimientoItem.CUMPLE,
        CumplimientoItem.PENDIENTE,
        CumplimientoItem.NO_APLICA,
      ],
    );
    await createInspection(
      ids.insCompleted,
      {
        sector: 'Producción',
        assignedTo: ids.tecnico,
        establishmentId: ids.estA1,
        state: EstadoInspeccion.COMPLETADA,
        startedAt: currentDate,
        createdAt: currentDate,
      },
      [
        CumplimientoItem.NO_CUMPLE,
        CumplimientoItem.OBSERVACION,
        CumplimientoItem.NO_APLICA,
      ],
    );
    await createInspection(
      ids.insPending,
      {
        sector: 'Mantenimiento',
        assignedTo: ids.tecnico,
        establishmentId: ids.estA1,
        state: EstadoInspeccion.PENDIENTE,
        startedAt: null,
        createdAt: currentDate,
      },
      [
        CumplimientoItem.PENDIENTE,
        CumplimientoItem.CUMPLE,
        CumplimientoItem.NO_APLICA,
      ],
    );
    await createInspection(
      ids.insOther,
      {
        sector: 'Logística',
        assignedTo: ids.usuarioOtro,
        establishmentId: ids.estA1,
        state: EstadoInspeccion.EN_PROGRESO,
        startedAt: currentDate,
        createdAt: currentDate,
      },
      [
        CumplimientoItem.CUMPLE,
        CumplimientoItem.CUMPLE,
        CumplimientoItem.NO_APLICA,
      ],
    );
    await createInspection(
      ids.insA2,
      {
        sector: 'Depósito',
        assignedTo: ids.tecnico,
        establishmentId: ids.estA2,
        state: EstadoInspeccion.COMPLETADA,
        startedAt: currentDate,
        createdAt: currentDate,
      },
      [
        CumplimientoItem.NO_CUMPLE,
        CumplimientoItem.PENDIENTE,
        CumplimientoItem.NO_APLICA,
      ],
    );
    await createInspection(
      ids.insPrevious,
      {
        sector: 'Producción',
        assignedTo: ids.tecnico,
        establishmentId: ids.estA1,
        state: EstadoInspeccion.COMPLETADA,
        startedAt: previousDate,
        createdAt: previousDate,
      },
      [
        CumplimientoItem.CUMPLE,
        CumplimientoItem.NO_APLICA,
        CumplimientoItem.NO_APLICA,
      ],
    );
    await prisma.inspeccion.create({
      data: {
        id: ids.insB,
        sector: 'Externo',
        empresaId: ids.empresaB,
        establecimientoId: ids.estB1,
        checklistId: ids.checklistB,
        creadoPorId: ids.usuarioB,
        asignadoAId: ids.usuarioB,
        usuarioId: ids.usuarioB,
        estado: EstadoInspeccion.EN_PROGRESO,
        fechaHoraInicio: currentDate,
        createdAt: currentDate,
        items: {
          create: {
            checklistItemId: ids.itemB,
            cumplimiento: CumplimientoItem.CUMPLE,
          },
        },
      },
    });
    await prisma.inspeccion.create({
      data: {
        id: ids.insOtherOrg,
        sector: 'Otra organización',
        empresaId: ids.empresa,
        organizacionEmpresaId: ids.relacionB,
        establecimientoId: ids.estA1,
        checklistId: ids.checklist,
        creadoPorId: ids.admin,
        asignadoAId: ids.admin,
        usuarioId: ids.admin,
        estado: EstadoInspeccion.EN_PROGRESO,
        fechaHoraInicio: currentDate,
        createdAt: currentDate,
        items: {
          create: [
            {
              checklistItemId: ids.item1,
              cumplimiento: CumplimientoItem.CUMPLE,
            },
            {
              checklistItemId: ids.item2,
              cumplimiento: CumplimientoItem.PENDIENTE,
            },
            {
              checklistItemId: ids.item3,
              cumplimiento: CumplimientoItem.NO_APLICA,
            },
          ],
        },
      },
    });

    await prisma.hallazgo.createMany({
      data: [
        {
          id: ids.h1,
          titulo: 'Crítico sin acción',
          descripcion: 'Open finding',
          nivelRiesgo: NivelRiesgo.CRITICO,
          estado: EstadoHallazgo.PENDIENTE,
          ubicacionTexto: 'Producción',
          inspeccionId: ids.insStarted,
        },
        {
          id: ids.h2,
          titulo: 'Alto con acción pendiente',
          descripcion: 'Open finding',
          nivelRiesgo: NivelRiesgo.ALTO,
          estado: EstadoHallazgo.EN_CORRECCION,
          ubicacionTexto: 'Producción',
          inspeccionId: ids.insStarted,
        },
        {
          id: ids.h3,
          titulo: 'Resuelto',
          descripcion: 'Closed finding',
          nivelRiesgo: NivelRiesgo.MEDIO,
          estado: EstadoHallazgo.EN_CORRECCION,
          ubicacionTexto: 'Producción',
          inspeccionId: ids.insCompleted,
        },
        {
          id: ids.h4,
          titulo: 'Bajo en progreso',
          descripcion: 'Open finding',
          nivelRiesgo: NivelRiesgo.BAJO,
          estado: EstadoHallazgo.EN_CORRECCION,
          ubicacionTexto: 'Mantenimiento',
          inspeccionId: ids.insPending,
        },
        {
          id: ids.h5,
          titulo: 'Acción externa',
          descripcion: 'Closed finding with assigned action',
          nivelRiesgo: NivelRiesgo.ALTO,
          estado: EstadoHallazgo.SOLUCIONADO,
          ubicacionTexto: 'Logística',
          inspeccionId: ids.insOther,
        },
        {
          id: ids.h6,
          titulo: 'Depósito sin acción',
          descripcion: 'Scoped out finding',
          nivelRiesgo: NivelRiesgo.MEDIO,
          estado: EstadoHallazgo.PENDIENTE,
          ubicacionTexto: 'Depósito',
          inspeccionId: ids.insA2,
        },
        {
          id: ids.hPrev,
          titulo: 'Hallazgo anterior',
          descripcion: 'Previous month',
          nivelRiesgo: NivelRiesgo.BAJO,
          estado: EstadoHallazgo.SOLUCIONADO,
          ubicacionTexto: 'Producción',
          inspeccionId: ids.insPrevious,
        },
        {
          id: ids.hB,
          titulo: 'Otro tenant',
          descripcion: 'Other company',
          nivelRiesgo: NivelRiesgo.CRITICO,
          ubicacionTexto: 'Externo',
          inspeccionId: ids.insB,
        },
        {
          id: ids.hOtherOrg,
          titulo: 'Otra organización',
          descripcion: 'Other organization',
          nivelRiesgo: NivelRiesgo.MEDIO,
          ubicacionTexto: 'Otra organización',
          inspeccionId: ids.insOtherOrg,
        },
      ],
    });
    await prisma.accionCorrectiva.createMany({
      data: [
        {
          id: ids.a2,
          descripcion: 'Pendiente vencida',
          fechaCompromiso: pastDue,
          estado: EstadoAccion.PENDIENTE,
          empresaId: ids.empresa,
          organizacionEmpresaId: ids.relacion,
          hallazgoId: ids.h2,
          creadorId: ids.admin,
          responsableId: ids.tecnico,
        },
        {
          id: ids.a3,
          descripcion: 'Resuelta',
          fechaCompromiso: futureDue,
          estado: EstadoAccion.RESUELTA,
          fechaCierre: currentDate,
          empresaId: ids.empresa,
          organizacionEmpresaId: ids.relacion,
          hallazgoId: ids.h3,
          creadorId: ids.admin,
          responsableId: ids.supervisor,
        },
        {
          id: ids.a7,
          descripcion: 'Pendiente del hallazgo mixto',
          fechaCompromiso: futureDue,
          estado: EstadoAccion.PENDIENTE,
          empresaId: ids.empresa,
          organizacionEmpresaId: ids.relacion,
          hallazgoId: ids.h3,
          creadorId: ids.admin,
          responsableId: ids.supervisor,
        },
        {
          id: ids.a4,
          descripcion: 'En progreso vencida',
          fechaCompromiso: pastDue,
          estado: EstadoAccion.EN_PROGRESO,
          empresaId: ids.empresa,
          organizacionEmpresaId: ids.relacion,
          hallazgoId: ids.h4,
          creadorId: ids.admin,
          responsableId: ids.tecnico,
        },
        {
          id: ids.a5,
          descripcion: 'Acción de otra inspección',
          fechaCompromiso: futureDue,
          estado: EstadoAccion.RESUELTA,
          fechaCierre: currentDate,
          empresaId: ids.empresa,
          organizacionEmpresaId: ids.relacion,
          hallazgoId: ids.h5,
          creadorId: ids.admin,
          responsableId: ids.tecnico,
        },
        {
          id: ids.aPrev,
          descripcion: 'Acción anterior',
          fechaCompromiso: previousDate,
          estado: EstadoAccion.RESUELTA,
          fechaCierre: previousDate,
          empresaId: ids.empresa,
          organizacionEmpresaId: ids.relacion,
          hallazgoId: ids.hPrev,
          creadorId: ids.admin,
          responsableId: ids.supervisor,
        },
        {
          id: ids.a6,
          descripcion: 'Acción marcada vencida',
          fechaCompromiso: pastDue,
          estado: EstadoAccion.VENCIDA,
          empresaId: ids.empresa,
          organizacionEmpresaId: ids.relacion,
          hallazgoId: ids.h6,
          creadorId: ids.admin,
          responsableId: ids.supervisor,
        },
      ],
    });

    const mixedFinding = await prisma.hallazgo.findUnique({
      where: { id: ids.h3 },
      include: { accionesCorrectivas: { select: { estado: true } } },
    });
    assert.deepEqual(
      mixedFinding?.accionesCorrectivas.map((action) => action.estado).sort(),
      [EstadoAccion.PENDIENTE, EstadoAccion.RESUELTA].sort(),
    );
    const actionlessFinding = await prisma.hallazgo.findUnique({
      where: { id: ids.h1 },
      include: { accionesCorrectivas: true },
    });
    assert.equal(actionlessFinding?.accionesCorrectivas.length, 0);
    const resolvedFinding = await prisma.hallazgo.findUnique({
      where: { id: ids.h5 },
      include: { accionesCorrectivas: true },
    });
    assert.equal(
      resolvedFinding?.accionesCorrectivas.every(
        (action) => action.estado === EstadoAccion.RESUELTA,
      ),
      true,
    );

    const adminKpis = await dashboard.getKPIs(ids.empresa, ids.relacion);
    assert.equal(adminKpis.inspeccionesEsteMes, 4);
    assert.equal(adminKpis.inspeccionesMesAnterior, 1);
    assert.equal(adminKpis.inspeccionesCompletadasEsteMes, 2);
    assert.equal(adminKpis.hallazgosTotal, 7);
    assert.equal(adminKpis.hallazgosAbiertos, 5);
    assert.equal(adminKpis.hallazgosCriticos, 1);
    assert.equal(adminKpis.hallazgosAltos, 2);
    assert.equal(adminKpis.accionesTotal, 7);
    assert.equal(adminKpis.accionesPendientes, 2);
    assert.equal(adminKpis.accionesEnProgreso, 1);
    assert.equal(adminKpis.accionesResueltas, 3);
    assert.equal(adminKpis.accionesVencidas, 3);
    assert.equal(adminKpis.tasaCumplimiento, 45);

    const technicianKpis = await dashboard.getKPIs(
      ids.empresa,
      ids.relacion,
      undefined,
      ids.acceso,
      ids.tecnico,
      Rol.TECNICO,
    );
    assert.equal(technicianKpis.inspeccionesEsteMes, 2);
    assert.equal(technicianKpis.inspeccionesMesAnterior, 1);
    assert.equal(technicianKpis.inspeccionesCompletadasEsteMes, 1);
    assert.equal(technicianKpis.hallazgosTotal, 5);
    assert.equal(technicianKpis.hallazgosAbiertos, 4);
    assert.equal(technicianKpis.accionesTotal, 3);
    assert.equal(technicianKpis.accionesPendientes, 1);
    assert.equal(technicianKpis.accionesEnProgreso, 1);
    assert.equal(technicianKpis.accionesResueltas, 1);
    assert.equal(technicianKpis.accionesVencidas, 2);
    assert.equal(technicianKpis.tasaCumplimiento, 43);

    const summary = await dashboard.getResumen(
      ids.empresa,
      undefined,
      ids.relacion,
    );
    assert.deepEqual(summary.inspecciones, {
      total: 6,
      iniciadas: 5,
      completadas: 3,
      enProgreso: 2,
      pendientes: 1,
      porcentajeCumplimiento: 45,
    });
    const top = await dashboard.getTopSectores(ids.empresa, 5, ids.relacion);
    assert.equal(top[0].sector, 'Producción');
    assert.equal(top[0].hallazgos, 4);
    assert.equal(
      (await dashboard.getTendencias(ids.empresa, 'mes', ids.relacion))
        .inspecciones[currentDate.toISOString().slice(0, 10)],
      4,
    );
    assert.equal(
      (await dashboard.getActividadReciente(ids.empresa, 20, ids.relacion))
        .acciones.length,
      7,
    );
    await assert.rejects(
      () =>
        dashboard.getKPIs(
          ids.empresa,
          ids.relacion,
          ids.estA2,
          ids.acceso,
          ids.tecnico,
          Rol.TECNICO,
        ),
      (error) => error instanceof NotFoundException,
    );
    const empty = await dashboard.getKPIs(ids.empresaVacia);
    assert.equal(empty.inspeccionesEsteMes, 0);
    assert.equal(empty.hallazgosTotal, 0);
    assert.equal(empty.tasaCumplimiento, null);
    const otherTenant = await dashboard.getKPIs(ids.empresaB);
    assert.equal(otherTenant.inspeccionesEsteMes, 1);
    const otherOrganization = await dashboard.getKPIs(
      ids.empresa,
      ids.relacionB,
    );
    assert.equal(otherOrganization.inspeccionesEsteMes, 1);
    assert.equal(otherOrganization.hallazgosTotal, 1);
    assert.equal(adminKpis.hallazgosTotal, 7);
    console.log(
      'PostgreSQL dashboard integration passed: numeric KPIs, scopes, states, compliance, trends, sectors, activity, empty data, and tenant isolation',
    );
  } finally {
    await cleanup();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
