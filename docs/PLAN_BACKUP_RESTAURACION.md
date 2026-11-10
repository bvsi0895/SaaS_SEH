# Plan de backup y restauración — Demo SEH

## Respaldo realizado

Se respaldó la base local de desarrollo y el directorio de evidencias el
10/11/2026. El respaldo quedó en `backups/fase6b-20261110-201628/`, excluido
por `.gitignore`.

- Dump PostgreSQL custom: `seh-development.dump`, 59.961 bytes.
- Evidencias copiadas: 7 archivos.
- Base original: `seh_db` en el contenedor local `seh-postgres-dev`.
- No se modificó ni eliminó la base original.

## Integridad verificada

El dump se restauró en un contenedor temporal PostgreSQL 16 aislado y luego el
contenedor fue eliminado. Los conteos coincidieron entre origen y restauración:

| Tabla | Origen | Restore |
|---|---:|---:|
| empresas | 5 | 5 |
| usuarios | 9 | 9 |
| inspecciones | 7 | 7 |
| hallazgos | 8 | 8 |
| acciones_correctivas | 6 | 6 |

## Procedimiento recomendado

1. Detener escrituras de la demo o anunciar una ventana breve.
2. Ejecutar `pg_dump -Fc` contra la base exclusiva de demo.
3. Copiar el volumen de evidencias `seh_uploads` o el almacenamiento de objetos.
4. Probar el dump en una base nueva, nunca con `prisma migrate reset`.
5. Aplicar `prisma migrate deploy` y luego `pg_restore --no-owner --no-privileges`.
6. Restaurar evidencias en el volumen correspondiente.
7. Validar `/api/health`, login ficticio, conteos y descarga de PDF.
8. Conservar al menos tres respaldos rotativos fuera del host de ejecución.

Los backups deben cifrarse en reposo y no deben incluirse en Git ni publicarse.
