# Arquitectura multiempresa propuesta para SEH

Estado: propuesta para revisión. Rama: `feature/multitenant-seguridad`. Base:
`e944838`. Migraciones aplicadas: ninguna.

## Objetivo y diagnóstico

SEH debe soportar profesionales independientes con varias empresas-clientes,
consultoras con técnicos y clientes, y PyMEs con sus establecimientos. La
unidad de aislamiento operativo será `Empresa`; `Organizacion` agrupará la
relación comercial y las membresías.

Hoy `Empresa` es el único tenant efectivo. `Usuario` tiene un solo `empresaId`
y `rol`; `Inspeccion.sector` es texto libre y no existe establecimiento. Los
servicios filtran mayormente por empresa, pero algunos DTOs administrativos
reciben `empresaId` del cliente y el JWT lo trata como contexto único.

## Modelo conceptual propuesto

El siguiente bloque es diseño documental, no código ejecutable:

```prisma
enum TipoOrganizacion { PROFESIONAL_INDEPENDIENTE CONSULTORA PYME }
enum RolOrganizacion { OWNER ADMIN_ORGANIZACION AUDITOR_ORGANIZACION }
enum RolEmpresa { ADMIN_EMPRESA SUPERVISOR TECNICO }

model Organizacion {
  id String @id @default(uuid())
  nombre String
  tipo TipoOrganizacion
  activa Boolean @default(true)
  empresas Empresa[]
  membresias MembresiaOrganizacion[]
}

model MembresiaOrganizacion {
  id String @id @default(uuid())
  organizacionId String
  usuarioId String
  rol RolOrganizacion
  activa Boolean @default(true)
  organizacion Organizacion @relation(fields: [organizacionId], references: [id])
  usuario Usuario @relation(fields: [usuarioId], references: [id])
  @@unique([organizacionId, usuarioId])
}

model Empresa {
  id String @id @default(uuid())
  nombre String
  organizacionId String // nullable sólo durante la transición
  organizacion Organizacion @relation(fields: [organizacionId], references: [id])
  establecimientos Establecimiento[]
  accesos AccesoEmpresa[]
}

model Establecimiento {
  id String @id @default(uuid())
  empresaId String
  nombre String
  codigo String?
  direccion String?
  activo Boolean @default(true)
  empresa Empresa @relation(fields: [empresaId], references: [id])
  accesos AccesoEstablecimiento[]
  inspecciones Inspeccion[]
  @@unique([empresaId, codigo])
}

model AccesoEmpresa {
  id String @id @default(uuid())
  usuarioId String
  empresaId String
  rol RolEmpresa
  activo Boolean @default(true)
  usuario Usuario @relation(fields: [usuarioId], references: [id])
  empresa Empresa @relation(fields: [empresaId], references: [id])
  establecimientos AccesoEstablecimiento[]
  @@unique([usuarioId, empresaId])
}

model AccesoEstablecimiento {
  accesoEmpresaId String
  establecimientoId String
  accesoEmpresa AccesoEmpresa @relation(fields: [accesoEmpresaId], references: [id])
  establecimiento Establecimiento @relation(fields: [establecimientoId], references: [id])
  @@id([accesoEmpresaId, establecimientoId])
}
```

Los modelos operativos conservarán `empresaId` como filtro principal.
`Inspeccion` incorporará `establecimientoId` nullable durante la transición y
obligatorio para nuevos registros después del backfill. Checklist, hallazgo,
acción correctiva y reportes heredan el alcance desde empresa o inspección.

## Contexto y aislamiento

```text
usuario autenticado → membresía de organización → acceso a empresa
→ acceso opcional a establecimiento → servicio/repositorio con filtros
```

- Nunca aceptar organización, empresa o rol privilegiado como autoridad desde un body público.
- Un `empresaId` de ruta es un selector candidato; se verifica contra `AccesoEmpresa` activo.
- Sin selección explícita se usa el contexto activo de sesión/token, nunca el primer recurso encontrado.
- Todo repositorio aplica el contexto resuelto; un `findById` sin filtro de empresa queda prohibido.
- Establecimientos se validan contra empresa y accesos del usuario.
- Las respuestas nunca incluyen recursos fuera del contexto autorizado.

## JWT y endpoints de contexto

Durante la transición el JWT conserva `empresaId` y `rol` para no romper web y
mobile. Se agregan `organizacionId`, `membresiaEmpresaId` y, si corresponde,
`establecimientoId`. El servidor valida que sigan activos; modificar el payload
en el cliente no eleva permisos.

Endpoints propuestos: `GET /api/contextos`, `POST /api/contextos/empresa` y
`POST /api/contextos/establecimiento`. Los endpoints actuales mantienen
compatibilidad legacy durante la migración de cada módulo.

## Modalidades

| Modalidad | Organización | Empresas | Acceso típico |
|---|---|---|---|
| Profesional independiente | `PROFESIONAL_INDEPENDIENTE` | varias | OWNER + acceso operativo por cliente |
| Consultora | `CONSULTORA` | varias | ADMIN_ORGANIZACION + técnicos asignados |
| PyME directa | `PYME` | una o varias propias | OWNER/ADMIN y técnicos propios |

## Archivos afectados

Backend: `backend/prisma/schema.prisma`, migraciones, seed, JWT strategy,
auth, guards, usuarios, empresas, checklists, inspecciones, hallazgos,
acciones, dashboard, reportes y repositorios/servicios con `empresaId`.

Web: `AuthContext`, cliente API, tipos de usuario, selector de contexto,
usuarios, empresas, inspecciones, reportes y rutas protegidas.

Mobile: sesión, almacenamiento seguro del contexto, selector de
empresa/establecimiento y clientes de inspecciones/reportes.

## Decisiones pendientes

No implementar ni migrar hasta aprobar si una empresa puede ser compartida por
varias organizaciones, si el establecimiento es obligatorio desde el primer
release, si los roles se separan por organización y empresa, y si cada cambio
de empresa renueva JWT/contexto.
