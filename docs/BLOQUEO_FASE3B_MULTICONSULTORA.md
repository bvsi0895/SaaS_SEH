# Bloqueo de Fase 3B: relación de una empresa con varias consultoras

Fecha: 2026-11-10  
Rama: `feature/multitenant-seguridad`  
Commit de diseño revisado: `feeba5a`

## Estado

La implementación queda detenida antes de modificar el esquema Prisma, crear
migraciones o ejecutar backfills. La demo existente no fue modificada.

Se verificó que Git estaba limpio al iniciar la revisión y que PostgreSQL de
desarrollo (`seh-postgres-dev`, base `seh_db`) estaba saludable. Se generó un
respaldo local previo en:

`backend/logs/seh_db_phase3b_prechange.dump`

La carpeta `backend/logs/` está excluida por `.gitignore`; el respaldo no debe
subirse al repositorio.

## Documentos revisados

- `docs/ARQUITECTURA_MULTITENANT.md`
- `docs/MATRIZ_PERMISOS_MULTITENANT.md`
- `docs/PLAN_MIGRACIONES_MULTITENANT.md`
- `docs/ESTIMACION_MULTITENANT.md`

## Contradicción crítica

La propuesta de arquitectura modela `Empresa` con un único
`organizacionId`:

```prisma
model Empresa {
  id            String @id @default(uuid())
  organizacionId String
  organizacion  Organizacion @relation(fields: [organizacionId], references: [id])
}
```

Eso hace que cada empresa tenga una sola organización propietaria. No permite
representar de forma correcta que una empresa cliente trabaje con dos o más
consultoras independientes.

El modelo `AccesoEmpresa` no resuelve la contradicción: vincula un usuario con
una empresa, pero no registra a qué organización pertenece la relación
profesional ni permite distinguir los datos compartidos en cada vínculo. Si se
agregan usuarios de varias consultoras como accesos directos a la misma
empresa, el acceso podría quedar compartido automáticamente entre consultoras,
contradiciendo el requisito de aislamiento.

El plan de migración también propone crear una organización `PYME` por cada
empresa y asociarla mediante `Empresa.organizacionId`; esa decisión fija una
única pertenencia y no contempla vínculos adicionales con consultoras.

## Riesgo de implementar ahora

Modificar sólo `Empresa.organizacionId` a una relación múltiple no es un cambio
local. Cambiaría la autoridad de los guards, el contexto JWT, los filtros de
repositorio, los permisos de técnicos, los reportes, las fotografías y el
backfill de datos existentes. Una implementación parcial podría:

- otorgar a una consultora acceso a datos de otra consultora;
- mezclar roles de organización con roles operativos de empresa;
- dejar recursos accesibles mediante `empresaId` sin una relación autorizada;
- hacer imposible determinar qué consultora puede leer o modificar un informe.

Por seguridad, no se aplicaron migraciones, no se modificó `schema.prisma`, no
se ejecutó `prisma migrate`, no se hizo backfill y no se alteraron datos.

## Resolución propuesta para aprobación

La alternativa segura es separar la entidad canónica `Empresa` de sus
relaciones con organizaciones:

1. Mantener `Empresa` como cliente/entidad operativa, sin usar una única
   organización como autoridad implícita.
2. Crear una relación explícita muchos-a-muchos, por ejemplo
   `RelacionOrganizacionEmpresa`, con `organizacionId`, `empresaId`, tipo de
   relación, estado, fechas y restricciones únicas.
3. Mantener `MembresiaOrganizacion` para la pertenencia del usuario a una
   organización.
4. Resolver el acceso efectivo mediante la combinación de membresía,
   relación organización–empresa y una asignación explícita de usuario a
   empresa o establecimiento.
5. Aplicar denegación por defecto: que dos organizaciones estén relacionadas
   con la misma empresa no concede a ninguna de ellas acceso automático a los
   datos de la otra.
6. Definir, antes de migrar, si los datos de una inspección pertenecen a la
   empresa y son visibles para todas las relaciones autorizadas, o si deben
   existir ámbitos separados por relación/servicio para que dos consultoras
   puedan trabajar sobre la misma empresa sin compartir inspecciones,
   hallazgos, acciones, fotografías y reportes.

La autorización debe validar la relación activa y el alcance del recurso en
cada consulta. Un `empresaId` recibido por ruta o body debe seguir siendo un
selector, nunca una concesión de permisos.

## Decisiones requeridas antes de implementar

1. Confirmar que una `Empresa` puede relacionarse con múltiples
   organizaciones.
2. Definir si la información operativa se comparte entre consultoras con
   autorización explícita de la empresa o si cada relación necesita un ámbito
   aislado.
3. Definir quién crea, aprueba, suspende y revoca cada relación.
4. Definir si un administrador de organización puede ver todos los recursos
   de una empresa vinculada o sólo los recursos asignados a su organización y
   a sus usuarios.
5. Aprobar el modelo de relación y el plan de backfill antes de tocar la base.

## Próximo paso verificable

Actualizar la arquitectura y la matriz de permisos con la decisión aprobada,
agregar casos de prueba de aislamiento entre dos consultoras sobre una misma
empresa y recién después preparar una migración aditiva sobre la base de
desarrollo respaldada.

