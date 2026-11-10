# Validación visual y funcional de la demo SEH

Fecha: 2026-11-10  
Workspace: `D:\Proyectos\SEH`  
Rama: `feature/estabilizacion-mvp`

## Alcance probado en navegador

La prueba se realizó con el frontend Vite en `http://localhost:5173` y el
backend NestJS en `http://localhost:3000`, utilizando datos ficticios de la
base local PostgreSQL.

Para las operaciones de administración se utilizó el usuario ficticio
administrador del seed. La inspección de demo quedó asociada a ese usuario;
no se utilizaron datos reales.

## Recorrido ejecutado desde la interfaz

| Paso | Resultado visual |
|---|---|
| Login | OK; redirigió al dashboard |
| Dashboard | OK después de corregir el adaptador de respuestas; mostró KPIs y actividad |
| Checklist | OK; creación desde formulario y agregado de ítem |
| Inspección | OK; selección de checklist, sector e inicio |
| Respuesta | OK; ítem visible como `Cumple`, progreso 1/1 |
| Hallazgo | OK; formulario validado y hallazgo visible en la inspección |
| Fotografía | OK; selector de archivo, upload multipart y mensaje de éxito |
| Acción correctiva | OK; creada desde el detalle del hallazgo |
| Finalización | OK; estado cambió a `Completada` |
| PDF | OK; botón `Descargar PDF` produjo descarga real en el navegador |

El archivo descargado fue:

`C:\Users\Jorge\Downloads\inspeccion-b7f932c7-0677-4276-a86c-d0fc5b342b0d.pdf`

## Errores encontrados y corregidos

1. El formulario de checklist ofrecía enums antiguos y enviaba `GENERAL` como
   valor fuera de las opciones MUI. Se alinearon las opciones con el enum real
   del backend.
2. El formulario de ítems no enviaba `orden`, requerido por el DTO NestJS. La
   interfaz ahora calcula el siguiente orden automáticamente.
3. El dashboard esperaba arrays y campos KPI que no coincidían con las
   respuestas reales. Se agregó un adaptador para `/dashboard/kpis`,
   `/dashboard/resumen`, tendencias agrupadas y actividad agrupada.
4. Las listas de inspecciones y hallazgos esperaban paginación, pero el backend
   devuelve arrays. Se normalizaron ambas respuestas en los clientes web.
5. El envío multipart heredaba `Content-Type: application/json`; se elimina
   ese header para `FormData`, habilitando el upload real.
6. La interfaz no exponía el endpoint de fotografía existente. Se agregó el
   selector restringido a JPG/PNG/WEBP hasta 5 MiB en el diálogo de hallazgo.

## Responsive

- Escritorio: validado a 1440×900. Sidebar, tarjetas, detalle y botón PDF
  visibles correctamente.
- Móvil: validado a 390×844. El sidebar colapsó, el detalle pasó a una columna,
  los campos y el botón PDF quedaron utilizables sin desbordamiento visible.

## Consola y solicitudes

Durante la primera ejecución se observó un crash de dashboard (`actividad?.map`
no era una función) y warnings por enums de checklist. Ambos quedaron
corregidos. También se observó un error transitorio de HMR relacionado con
`useAuth` mientras Vite recompilaba módulos; después de recargar la aplicación
la navegación y el recorrido funcionaron.

Quedaron únicamente warnings no bloqueantes de React Router sobre flags futuros
y el warning de Vite por un chunk mayor a 500 kB.

## Validación previa por API

Antes de esta prueba ya se había verificado por API el aislamiento entre
empresas, autorización de acciones, migración/seed, generación PDF y descarga
autenticada de fotografías. Este documento separa esas comprobaciones de las
acciones efectivamente ejecutadas en navegador.

## Capturas

Durante la sesión se tomaron capturas visuales del dashboard, inspección en
progreso, inspección completada en móvil y escritorio. La herramienta de
navegador las mostró inline como evidencia de la prueba; su API no expone una
ruta local para materializar esos bytes como PNG dentro del workspace. Por eso
no se presentan archivos PNG inexistentes como si fueran entregables.

## Estado

El recorrido completo funciona desde la interfaz. No se hizo merge ni deploy.
