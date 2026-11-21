# PR #23 — ciclo de resolución de hallazgos

PR #23 mantiene su ciclo de hallazgos sobre `feature/demo-online` y ahora incorpora mediante merge las correcciones del generador PDF de PR #22.

El endpoint de reporte de hallazgos y los generadores de inspección y mensual entregan/muestran `estado`, `fechaResolucion`, `responsableResolucion`, `descripcionSolucion` e `historial` cuando corresponde: riesgo original, estado actual, fecha, responsable y descripción de solución. La integración conserva el alcance por `empresaId`, `organizacionEmpresaId` y establecimiento, además de las fotos autorizadas, el logo y la paginación.

La creación de una acción correctiva cambia el hallazgo a `EN_CORRECCION`; cerrar la acción sólo registra la acción como ejecutada. El hallazgo pasa a `SOLUCIONADO` únicamente mediante corrección inmediata o verificación explícita.
