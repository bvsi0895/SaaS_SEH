import { PrismaClient, Rol, TipoChecklist, CumplimientoItem, NivelRiesgo, EstadoAccion, EstadoInspeccion } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // 1. Crear empresa demo
  const empresa = await prisma.empresa.upsert({
    where: { cuit: '30-71234567-8' },
    update: {},
    create: {
      nombre: 'Empresa Demo S.A.',
      cuit: '30-71234567-8',
      direccion: 'Av. Corrientes 1234, CABA',
      telefono: '+54 11 4567-8901',
      email: 'contacto@empresademo.com.ar',
      activa: true,
    },
  });
  console.log('✅ Empresa creada:', empresa.nombre);

  // 2. Crear usuarios
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const adminEmpresa = await prisma.usuario.upsert({
    where: { email: 'admin@empresademo.com.ar' },
    update: {},
    create: {
      email: 'admin@empresademo.com.ar',
      password: passwordHash,
      nombre: 'Carlos',
      apellido: 'Administrador',
      rol: Rol.ADMIN_EMPRESA,
      empresaId: empresa.id,
      activo: true,
    },
  });
  console.log('✅ Admin empresa creado:', adminEmpresa.email);

  const supervisor = await prisma.usuario.upsert({
    where: { email: 'supervisor@empresademo.com.ar' },
    update: {},
    create: {
      email: 'supervisor@empresademo.com.ar',
      password: passwordHash,
      nombre: 'María',
      apellido: 'Supervisora',
      rol: Rol.SUPERVISOR,
      empresaId: empresa.id,
      activo: true,
    },
  });
  console.log('✅ Supervisor creado:', supervisor.email);

  const tecnico1 = await prisma.usuario.upsert({
    where: { email: 'tecnico1@empresademo.com.ar' },
    update: {},
    create: {
      email: 'tecnico1@empresademo.com.ar',
      password: passwordHash,
      nombre: 'Juan',
      apellido: 'Técnico',
      rol: Rol.TECNICO,
      empresaId: empresa.id,
      activo: true,
    },
  });
  console.log('✅ Técnico 1 creado:', tecnico1.email);

  const tecnico2 = await prisma.usuario.upsert({
    where: { email: 'tecnico2@empresademo.com.ar' },
    update: {},
    create: {
      email: 'tecnico2@empresademo.com.ar',
      password: passwordHash,
      nombre: 'Ana',
      apellido: 'Inspectora',
      rol: Rol.TECNICO,
      empresaId: empresa.id,
      activo: true,
    },
  });
  console.log('✅ Técnico 2 creado:', tecnico2.email);

  // 3. Crear checklists con items
  const checklistSeguridad = await prisma.checklist.upsert({
    where: { id: 'checklist-seguridad-general' },
    update: {},
    create: {
      id: 'checklist-seguridad-general',
      nombre: 'Inspección de Seguridad General',
      descripcion: 'Checklist para verificar condiciones generales de seguridad en el área de trabajo',
      tipo: TipoChecklist.SEGURIDAD,
      empresaId: empresa.id,
      activo: true,
      items: {
        create: [
          { descripcion: 'Extintores en buen estado y con carga vigente', orden: 1, obligatorio: true },
          { descripcion: 'Señalización de emergencia visible y en buen estado', orden: 2, obligatorio: true },
          { descripcion: 'Rutas de evacuación despejadas', orden: 3, obligatorio: true },
          { descripcion: 'Iluminación de emergencia funcionando', orden: 4, obligatorio: true },
          { descripcion: 'Botiquín de primeros auxilios completo', orden: 5, obligatorio: true },
          { descripcion: 'Personal usa EPP adecuado', orden: 6, obligatorio: true },
          { descripcion: 'Pasillos libres de obstáculos', orden: 7, obligatorio: false },
          { descripcion: 'Instalaciones eléctricas en buen estado', orden: 8, obligatorio: true },
          { descripcion: 'Orden y limpieza general del área', orden: 9, obligatorio: false },
          { descripcion: 'Matafuegos accesibles y sin obstrucciones', orden: 10, obligatorio: true },
        ],
      },
    },
  });
  console.log('✅ Checklist de seguridad creado:', checklistSeguridad.nombre);

  const checklistHigiene = await prisma.checklist.upsert({
    where: { id: 'checklist-higiene-industrial' },
    update: {},
    create: {
      id: 'checklist-higiene-industrial',
      nombre: 'Inspección de Higiene Industrial',
      descripcion: 'Verificación de condiciones de higiene en áreas productivas',
      tipo: TipoChecklist.HIGIENE,
      empresaId: empresa.id,
      activo: true,
      items: {
        create: [
          { descripcion: 'Ventilación adecuada en el área', orden: 1, obligatorio: true },
          { descripcion: 'Niveles de ruido dentro de parámetros', orden: 2, obligatorio: true },
          { descripcion: 'Iluminación suficiente para las tareas', orden: 3, obligatorio: true },
          { descripcion: 'Temperatura ambiente confortable', orden: 4, obligatorio: false },
          { descripcion: 'Sanitarios limpios y funcionales', orden: 5, obligatorio: true },
          { descripcion: 'Agua potable disponible', orden: 6, obligatorio: true },
          { descripcion: 'Gestión adecuada de residuos', orden: 7, obligatorio: true },
          { descripcion: 'Control de plagas al día', orden: 8, obligatorio: false },
        ],
      },
    },
  });
  console.log('✅ Checklist de higiene creado:', checklistHigiene.nombre);

  const checklistEPP = await prisma.checklist.upsert({
    where: { id: 'checklist-epp' },
    update: {},
    create: {
      id: 'checklist-epp',
      nombre: 'Control de Elementos de Protección Personal',
      descripcion: 'Verificación del uso y estado de EPP',
      tipo: TipoChecklist.EPP,
      empresaId: empresa.id,
      activo: true,
      items: {
        create: [
          { descripcion: 'Casco de seguridad en buen estado', orden: 1, obligatorio: true },
          { descripcion: 'Calzado de seguridad adecuado', orden: 2, obligatorio: true },
          { descripcion: 'Guantes de protección según tarea', orden: 3, obligatorio: true },
          { descripcion: 'Protección auditiva cuando corresponde', orden: 4, obligatorio: true },
          { descripcion: 'Protección visual (anteojos/antiparras)', orden: 5, obligatorio: true },
          { descripcion: 'Ropa de trabajo adecuada', orden: 6, obligatorio: false },
          { descripcion: 'Arnés de seguridad para trabajo en altura', orden: 7, obligatorio: true },
          { descripcion: 'Protección respiratoria cuando aplica', orden: 8, obligatorio: true },
        ],
      },
    },
  });
  console.log('✅ Checklist de EPP creado:', checklistEPP.nombre);

  // 4. Crear algunas inspecciones de ejemplo
  const inspeccion1 = await prisma.inspeccion.create({
    data: {
      sector: 'Planta de Producción - Sector A',
      descripcion: 'Inspección mensual de seguridad',
      estado: EstadoInspeccion.COMPLETADA,
      fechaHoraInicio: new Date('2024-01-15T09:00:00'),
      fechaHoraFin: new Date('2024-01-15T10:30:00'),
      observaciones: 'Se detectaron algunos hallazgos menores que requieren atención',
      empresaId: empresa.id,
      usuarioId: tecnico1.id,
      checklistId: checklistSeguridad.id,
      items: {
        create: [
          { cumplimiento: CumplimientoItem.CUMPLE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistSeguridad.id, orden: 1 } }))!.id },
          { cumplimiento: CumplimientoItem.NO_CUMPLE, observacion: 'Señalización deteriorada en pasillo 3', checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistSeguridad.id, orden: 2 } }))!.id },
          { cumplimiento: CumplimientoItem.CUMPLE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistSeguridad.id, orden: 3 } }))!.id },
          { cumplimiento: CumplimientoItem.CUMPLE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistSeguridad.id, orden: 4 } }))!.id },
          { cumplimiento: CumplimientoItem.OBSERVACION, observacion: 'Falta alcohol en gel', checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistSeguridad.id, orden: 5 } }))!.id },
          { cumplimiento: CumplimientoItem.CUMPLE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistSeguridad.id, orden: 6 } }))!.id },
          { cumplimiento: CumplimientoItem.CUMPLE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistSeguridad.id, orden: 7 } }))!.id },
          { cumplimiento: CumplimientoItem.NO_CUMPLE, observacion: 'Cable expuesto en zona de carga', checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistSeguridad.id, orden: 8 } }))!.id },
          { cumplimiento: CumplimientoItem.CUMPLE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistSeguridad.id, orden: 9 } }))!.id },
          { cumplimiento: CumplimientoItem.CUMPLE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistSeguridad.id, orden: 10 } }))!.id },
        ],
      },
    },
  });
  console.log('✅ Inspección 1 creada');

  // 5. Crear hallazgos para la inspección
  const hallazgo1 = await prisma.hallazgo.create({
    data: {
      titulo: 'Señalización de emergencia deteriorada',
      descripcion: 'La señalización del pasillo 3 presenta deterioro por humedad, dificultando su visibilidad',
      nivelRiesgo: NivelRiesgo.MEDIO,
      ubicacionTexto: 'Pasillo 3 - Planta de Producción Sector A',
      inspeccionId: inspeccion1.id,
    },
  });

  const hallazgo2 = await prisma.hallazgo.create({
    data: {
      titulo: 'Cable eléctrico expuesto',
      descripcion: 'Se detectó un cable de alimentación con aislación dañada en la zona de carga, representando riesgo de electrocución',
      nivelRiesgo: NivelRiesgo.ALTO,
      ubicacionTexto: 'Zona de carga - Planta de Producción Sector A',
      inspeccionId: inspeccion1.id,
    },
  });
  console.log('✅ Hallazgos creados');

  // 6. Crear acciones correctivas
  await prisma.accionCorrectiva.create({
    data: {
      descripcion: 'Reemplazar señalización deteriorada por nueva cartelería reflectiva',
      fechaCompromiso: new Date('2024-02-01'),
      estado: EstadoAccion.RESUELTA,
      fechaCierre: new Date('2024-01-25'),
      empresaId: empresa.id,
      hallazgoId: hallazgo1.id,
      responsableId: supervisor.id,
    },
  });

  await prisma.accionCorrectiva.create({
    data: {
      descripcion: 'Reparar aislación del cable y realizar verificación de toda la instalación eléctrica del sector',
      fechaCompromiso: new Date('2024-01-20'),
      estado: EstadoAccion.EN_PROGRESO,
      empresaId: empresa.id,
      hallazgoId: hallazgo2.id,
      responsableId: supervisor.id,
    },
  });
  console.log('✅ Acciones correctivas creadas');

  // 7. Crear una segunda inspección
  const inspeccion2 = await prisma.inspeccion.create({
    data: {
      sector: 'Depósito Central',
      descripcion: 'Inspección de higiene mensual',
      estado: EstadoInspeccion.COMPLETADA,
      fechaHoraInicio: new Date('2024-01-18T14:00:00'),
      fechaHoraFin: new Date('2024-01-18T15:15:00'),
      observaciones: 'Todas las condiciones en orden',
      empresaId: empresa.id,
      usuarioId: tecnico2.id,
      checklistId: checklistHigiene.id,
      items: {
        create: [
          { cumplimiento: CumplimientoItem.CUMPLE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistHigiene.id, orden: 1 } }))!.id },
          { cumplimiento: CumplimientoItem.CUMPLE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistHigiene.id, orden: 2 } }))!.id },
          { cumplimiento: CumplimientoItem.CUMPLE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistHigiene.id, orden: 3 } }))!.id },
          { cumplimiento: CumplimientoItem.CUMPLE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistHigiene.id, orden: 4 } }))!.id },
          { cumplimiento: CumplimientoItem.CUMPLE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistHigiene.id, orden: 5 } }))!.id },
          { cumplimiento: CumplimientoItem.CUMPLE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistHigiene.id, orden: 6 } }))!.id },
          { cumplimiento: CumplimientoItem.CUMPLE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistHigiene.id, orden: 7 } }))!.id },
          { cumplimiento: CumplimientoItem.NO_APLICA, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistHigiene.id, orden: 8 } }))!.id },
        ],
      },
    },
  });
  console.log('✅ Inspección 2 creada');

  // 8. Crear una inspección en progreso
  await prisma.inspeccion.create({
    data: {
      sector: 'Oficinas Administrativas',
      descripcion: 'Control de EPP del personal',
      estado: EstadoInspeccion.EN_PROGRESO,
      fechaHoraInicio: new Date(),
      empresaId: empresa.id,
      usuarioId: tecnico1.id,
      checklistId: checklistEPP.id,
      items: {
        create: [
          { cumplimiento: CumplimientoItem.CUMPLE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistEPP.id, orden: 1 } }))!.id },
          { cumplimiento: CumplimientoItem.CUMPLE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistEPP.id, orden: 2 } }))!.id },
          { cumplimiento: CumplimientoItem.PENDIENTE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistEPP.id, orden: 3 } }))!.id },
          { cumplimiento: CumplimientoItem.PENDIENTE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistEPP.id, orden: 4 } }))!.id },
          { cumplimiento: CumplimientoItem.PENDIENTE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistEPP.id, orden: 5 } }))!.id },
          { cumplimiento: CumplimientoItem.PENDIENTE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistEPP.id, orden: 6 } }))!.id },
          { cumplimiento: CumplimientoItem.PENDIENTE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistEPP.id, orden: 7 } }))!.id },
          { cumplimiento: CumplimientoItem.PENDIENTE, checklistItemId: (await prisma.checklistItem.findFirst({ where: { checklistId: checklistEPP.id, orden: 8 } }))!.id },
        ],
      },
    },
  });
  console.log('✅ Inspección en progreso creada');

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('\n📋 Credenciales de prueba:');
  console.log('   Admin:      admin@empresademo.com.ar / Password123!');
  console.log('   Supervisor: supervisor@empresademo.com.ar / Password123!');
  console.log('   Técnico 1:  tecnico1@empresademo.com.ar / Password123!');
  console.log('   Técnico 2:  tecnico2@empresademo.com.ar / Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
