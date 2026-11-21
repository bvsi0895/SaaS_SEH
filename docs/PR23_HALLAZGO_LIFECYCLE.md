# PR #23 — ciclo de resolución de hallazgos

PR #23 nace directamente de `feature/demo-online` en el merge de PR #21 y no depende del generador PDF de PR #22.

El endpoint de reporte de hallazgos ya entrega `estado`, `fechaResolucion`, `responsableResolucion`, `descripcionSolucion` e `historial`. Cuando PR #22 se integre, su generador de PDF debe mapear esos mismos campos en cada hallazgo: riesgo original, estado actual, fecha, responsable y descripción de solución. La integración debe conservar el alcance por `empresaId`, `organizacionEmpresaId` y establecimiento.

La creación de una acción correctiva cambia el hallazgo a `EN_CORRECCION`; cerrar la acción sólo registra la acción como ejecutada. El hallazgo pasa a `SOLUCIONADO` únicamente mediante corrección inmediata o verificación explícita.
