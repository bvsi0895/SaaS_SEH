# Arquitectura multiempresa de SEH

Estado: diseño aprobado e implementado parcialmente; la validación de Fase 3D se documenta en `docs/VALIDACION_MULTITENANT_FASE3D.md`.
Rama: `feature/multitenant-seguridad`.
Base de diseño: `e9de9b6`.
Migraciones aplicadas: ninguna.

## Decisión de aislamiento

Una `Empresa` puede estar vinculada con varias organizaciones. Cada vínculo
representa un espacio de trabajo independiente (`OrganizacionEmpresa`). La
coincidencia de `empresaId` nunca concede acceso a los datos de otro vínculo.

El permiso efectivo requiere simultáneamente:

```text
usuario autenticado
  → OrganizacionMiembro activa
  → OrganizacionEmpresa activa
  → AccesoEmpresa explícito y activo
  → AccesoEstablecimiento, si el recurso lo exige
  → ámbito del recurso = OrganizacionEmpresa autorizada
```

La organización es titular del espacio de trabajo. La empresa es la entidad
industrial o cliente compartida como referencia comercial. La relación
`OrganizacionEmpresa` es el límite de aislamiento de los datos operativos.

## Modelo Prisma propuesto

El siguiente esquema es diseño documental; no se incorporó todavía a
`backend/prisma/schema.prisma`.

```prisma
enum TipoOrganizacion { PROFESIONAL_INDEPENDIENTE CONSULTORA PYME }
enum RolOrganizacion { OWNER ADMIN_ORGANIZACION AUDITOR_ORGANIZACION }
enum RolEmpresa { ADMIN_EMPRESA SUPERVISOR TECNICO }
enum EstadoRelacionEmpresa { ACTIVA SUSPENDIDA REVOCADA }

model Organizacion {
  id              String                 @id @default(uuid())
  nombre          String
  tipo            TipoOrganizacion
  activa          Boolean                @default(true)
  miembros        OrganizacionMiembro[]
  empresas        OrganizacionEmpresa[]
  creadaEn        DateTime               @default(now())
  actualizadaEn   DateTime               @updatedAt
  @@index([activa])
}

model OrganizacionMiembro {
  id              String                 @id @default(uuid())
  organizacionId  String
  usuarioId       String
  rol             RolOrganizacion
  activa          Boolean                @default(true)
  organizacion    Organizacion           @relation(fields: [organizacionId], references: [id])
  usuario         Usuario                @relation(fields: [usuarioId], references: [id])
  accesosEmpresa  AccesoEmpresa[]
  @@unique([organizacionId, usuarioId])
  @@unique([id, organizacionId])
  @@index([usuarioId, activa])
}

model Empresa {
  id              String                 @id @default(uuid())
  nombre          String
  relaciones      OrganizacionEmpresa[]
  establecimientos Establecimiento[]
  @@index([nombre])
}

model OrganizacionEmpresa {
  id              String                 @id @default(uuid())
  organizacionId  String
  empresaId       String
  estado          EstadoRelacionEmpresa @default(ACTIVA)
  creadaEn        DateTime               @default(now())
  actualizadaEn   DateTime               @updatedAt
  organizacion    Organizacion           @relation(fields: [organizacionId], references: [id])
  empresa         Empresa                @relation(fields: [empresaId], references: [id])
  accesos         AccesoEmpresa[]
  inspecciones    Inspeccion[]
  checklists      Checklist[]
  @@unique([organizacionId, empresaId])
  @@unique([id, organizacionId, empresaId])
  @@index([empresaId, estado])
  @@index([organizacionId, estado])
}

model Establecimiento {
  id              String                 @id @default(uuid())
  empresaId       String
  nombre          String
  codigo          String?
  direccion       String?
  activo          Boolean                @default(true)
  empresa         Empresa                @relation(fields: [empresaId], references: [id])
  accesos         AccesoEstablecimiento[]
  inspecciones    Inspeccion[]
  @@unique([empresaId, codigo])
  @@unique([id, empresaId])
  @@index([empresaId, activo])
}

model AccesoEmpresa {
  id                     String                 @id @default(uuid())
  organizacionEmpresaId  String
  organizacionMiembroId  String
  organizacionId         String
  empresaId              String
  rol                    RolEmpresa
  activo                 Boolean                @default(true)
  organizacionEmpresa    OrganizacionEmpresa   @relation(fields: [organizacionEmpresaId, organizacionId, empresaId], references: [id, organizacionId, empresaId])
  organizacionMiembro    OrganizacionMiembro   @relation(fields: [organizacionMiembroId, organizacionId], references: [id, organizacionId])
  establecimientos       AccesoEstablecimiento[]
  @@unique([organizacionEmpresaId, organizacionMiembroId])
  @@index([organizacionMiembroId, activo])
  @@index([empresaId, organizacionId, activo])
}

model AccesoEstablecimiento {
  accesoEmpresaId   String
  establecimientoId String
  empresaId         String
  accesoEmpresa     AccesoEmpresa   @relation(fields: [accesoEmpresaId], references: [id])
  establecimiento   Establecimiento @relation(fields: [establecimientoId, empresaId], references: [id, empresaId])
  @@id([accesoEmpresaId, establecimientoId])
  @@index([establecimientoId])
}
```

Las claves compuestas de `AccesoEmpresa` impiden combinar una membresía de
una organización con la relación empresa–organización de otra. La clave
compuesta de `AccesoEstablecimiento` impide asignar un establecimiento de otra
empresa. Las restricciones únicas evitan duplicar vínculos o accesos. La
validación de que el miembro y la relación estén activos sigue siendo
obligatoria en backend.

## Ámbito de los registros operativos

Los modelos nuevos deben conservar `empresaId` para compatibilidad y agregar
`organizacionEmpresaId` como ámbito obligatorio para los registros privados:

- `Checklist`: `organizacionEmpresaId` para plantillas privadas; sólo una
  plantilla explícitamente global puede carecer de ámbito.
- `Inspeccion`: `organizacionEmpresaId` obligatorio para altas nuevas y
  `establecimientoId` validado contra la misma empresa.
- `Hallazgo`, `AccionCorrectiva`, fotografías e informe: heredan el ámbito de
  `Inspeccion`; sus servicios sólo pueden operar partiendo de una inspección
  autorizada.
- Cualquier recurso administrativo que no dependa de una inspección debe
  guardar su propio `organizacionEmpresaId`.

El filtro mínimo de un expediente es `organizacionEmpresaId`, no sólo
`empresaId`. Las consultas que listan una empresa vinculada a varias
organizaciones deben seleccionar primero el `OrganizacionEmpresa` autorizado y
luego filtrar por ese identificador. No se mezclan expedientes de consultoras.

## Autorización y contexto

El backend resuelve un contexto desde una membresía y un acceso activos. Los
identificadores enviados por el frontend son selectores candidatos. Guards,
servicios y repositorios deben verificar:

1. JWT válido y usuario activo.
2. `OrganizacionMiembro(organizacionId, usuarioId)` activa.
3. `OrganizacionEmpresa` activa para la empresa solicitada.
4. `AccesoEmpresa` activo para esa membresía y relación.
5. Acceso al establecimiento cuando corresponda.
6. El recurso pertenece al mismo `organizacionEmpresaId` del contexto.

El JWT puede conservar temporalmente `empresaId` y `rol` para no romper la demo,
pero no son autoridad. El contexto nuevo debe incluir
`organizacionId`, `organizacionEmpresaId` y, si corresponde,
`establecimientoId`; el servidor vuelve a validarlos en cada operación sensible.

`GET /api/auth/contextos` devuelve los contextos autorizados. Web y mobile
persisten únicamente la preferencia `organizacionEmpresaId` y la envían como
selector. El backend la vuelve a validar en cada operación mediante el guard;
la preferencia del cliente nunca es autoridad.

## Compatibilidad con la demo

La transición mantiene `Usuario.empresaId` y `Usuario.rol` como campos legacy,
mantiene los contratos actuales y permite resolver una organización inicial
para la demo. Las nuevas altas escriben el ámbito nuevo y los campos legacy
durante la etapa dual. Ningún endpoint público podrá aceptar `empresaId`,
`organizacionId` o roles privilegiados como concesión de permisos.

## Modalidades

| Modalidad | Organización | Relación con empresa | Aislamiento |
|---|---|---|---|
| Profesional independiente | propia | una o varias | un vínculo por cliente |
| Consultora | propia | varias empresas | técnicos asignados por vínculo |
| PyME directa | propia | empresa propia | usuarios de la PyME |
| Empresa con varias consultoras | varias organizaciones | varios vínculos | expedientes separados por vínculo |

## Archivos afectados en implementación posterior

Backend: `schema.prisma`, migraciones, seed, estrategia JWT, guards, auth,
usuarios, empresas, checklists, inspecciones, hallazgos, acciones, dashboard,
reportes, fotografías y todos los repositorios que hoy filtran sólo por
`empresaId`.

Web y mobile: sesión, contexto activo, clientes API, tipos, selector de
organización/empresa/establecimiento, inspecciones y reportes.

Tests: autorización cruzada, aislamiento de expedientes, claves de contexto,
compatibilidad legacy y regresión de la demo.
