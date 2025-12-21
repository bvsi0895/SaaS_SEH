# 👔 Manual del Administrador - Sistema SEH

> Guía para administradores y supervisores que gestionan el sistema

## 🎯 Rol del Administrador

Como administrador del sistema SEH, puedes:

- ✅ Gestionar checklists personalizados
- ✅ Visualizar dashboard con métricas clave
- ✅ Revisar todas las inspecciones de la empresa
- ✅ Gestionar acciones correctivas
- ✅ Administrar usuarios
- ✅ Configurar la empresa
- ✅ Exportar reportes y datos

---

## 📊 Dashboard Principal

Al iniciar sesión como administrador, verás el dashboard con métricas clave:

```
┌──────────────────────────────────────────────────────────┐
│  Dashboard de Seguridad                                   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  📈 Resumen del Mes                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ ┌──────────┐│
│  │    45    │  │    23    │  │    18    │ │   85%    ││
│  │Inspecciones  │Hallazgos │ │Acciones  │ │Cumplimiento│
│  └──────────┘  └──────────┘  └──────────┘ └──────────┘│
│                                                           │
│  📊 Hallazgos por Nivel de Riesgo                        │
│  ┌─────────────────────────────────────────┐             │
│  │ Crítico  ▓ 2                            │             │
│  │ Alto     ▓▓▓▓▓▓ 12                      │             │
│  │ Medio    ▓▓▓▓ 8                         │             │
│  │ Bajo     ▓ 1                            │             │
│  └─────────────────────────────────────────┘             │
│                                                           │
│  📈 Tendencia de Inspecciones                            │
│  [Gráfico de líneas mostrando inspecciones por semana]   │
│                                                           │
│  🎯 Top 5 Sectores con Más Hallazgos                     │
│  1. Línea producción 2    - 15 hallazgos                 │
│  2. Almacén principal     - 12 hallazgos                 │
│  3. Taller mecánico       - 9 hallazgos                  │
│  4. Área de carga         - 7 hallazgos                  │
│  5. Oficinas planta baja  - 5 hallazgos                  │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Filtros del Dashboard

Puedes filtrar métricas por:
- **Período:** Hoy / Semana / Mes / Trimestre / Año / Personalizado
- **Sector:** Todos / Específico
- **Técnico:** Todos / Específico
- **Tipo de checklist:** Todos / Específico

---

## 📋 Gestión de Checklists

Los checklists son las plantillas que usan los técnicos para realizar inspecciones.

### Ver Checklists

1. Ir a **"Checklists"** en el menú
2. Ver lista de checklists disponibles

```
┌─────────────────────────────────────┐
│  Checklists                          │
│  [+ Nuevo Checklist]                 │
├─────────────────────────────────────┤
│                                     │
│  📋 Orden y Limpieza (Activo)       │
│  Tipo: ORDEN_LIMPIEZA               │
│  15 items                           │
│  Usado en 28 inspecciones           │
│  [Editar] [Duplicar] [Desactivar]   │
│  ────────────────────────────        │
│                                     │
│  📋 EPP (Activo)                    │
│  Tipo: EPP                          │
│  12 items                           │
│  Usado en 19 inspecciones           │
│  [Editar] [Duplicar] [Desactivar]   │
│  ────────────────────────────        │
│                                     │
└─────────────────────────────────────┘
```

### Crear Nuevo Checklist

1. Hacer clic en **"+ Nuevo Checklist"**
2. Completar información:

```
┌─────────────────────────────────────┐
│  Nuevo Checklist                     │
├─────────────────────────────────────┤
│                                     │
│  Nombre:                            │
│  [Ej: "Inspección de Maquinaria"]   │
│                                     │
│  Descripción:                       │
│  [Descripción del checklist...]     │
│                                     │
│  Tipo:                              │
│  [Seleccionar tipo ▼]               │
│  - General                          │
│  - EPP                              │
│  - Orden y Limpieza                 │
│  - Riesgo Químico                   │
│  - Maquinaria                       │
│  - Ergonomía                        │
│  - Incendio                         │
│  - Otro                             │
│                                     │
│  Items del Checklist:               │
│                                     │
│  1. [Descripción del item 1]        │
│     [X] Obligatorio                 │
│     [Eliminar] [↑] [↓]              │
│                                     │
│  2. [Descripción del item 2]        │
│     [X] Obligatorio                 │
│     [Eliminar] [↑] [↓]              │
│                                     │
│  [+ Agregar Item]                   │
│                                     │
│  [Guardar Checklist]                │
│                                     │
└─────────────────────────────────────┘
```

3. Hacer clic en **"Guardar Checklist"**

**💡 Tips para crear buenos checklists:**

- ✅ **Sé específico:** "Pisos limpios y secos" mejor que "Limpieza general"
- ✅ **Usa lenguaje claro:** Evita tecnicismos innecesarios
- ✅ **Ordena lógicamente:** Agrupa items relacionados
- ✅ **No más de 30 items:** Checklists muy largos cansan
- ✅ **Revisa periódicamente:** Actualiza según necesidad

### Editar Checklist Existente

1. Ir a **"Checklists"**
2. Hacer clic en **"Editar"** del checklist deseado
3. Modificar:
   - Nombre y descripción
   - Agregar/eliminar items
   - Reordenar items (arrastrar o usar flechas)
4. Hacer clic en **"Guardar cambios"**

**⚠️ Advertencia:** Los cambios en un checklist NO afectan las inspecciones ya realizadas con la versión anterior.

### Duplicar Checklist

Útil para crear variaciones de un checklist existente:

1. Hacer clic en **"Duplicar"**
2. El sistema crea una copia
3. Editar la copia según necesidad

### Desactivar Checklist

Si un checklist ya no se usa:

1. Hacer clic en **"Desactivar"**
2. El checklist NO se elimina
3. Ya no aparecerá para nuevas inspecciones
4. Las inspecciones anteriores siguen accesibles

**No puedes eliminar permanentemente un checklist que fue usado en inspecciones.**

---

## 🔍 Revisar Inspecciones

Como administrador, puedes ver TODAS las inspecciones de la empresa.

### Lista de Inspecciones

1. Ir a **"Inspecciones"**
2. Ver inspecciones con filtros avanzados:

```
Filtros disponibles:
- Estado: Todas / En progreso / Completadas / Canceladas
- Técnico: Todos / Específico
- Checklist: Todos / Específico
- Sector: Todos / Específico
- Rango de fechas: Personalizado
- Con hallazgos: Sí / No / Todos
```

### Detalle de Inspección

Al abrir una inspección, puedes ver:

- **Información general:**
  - Técnico que la realizó
  - Fecha y hora inicio/fin
  - Duración total
  - Sector inspeccionado

- **Resultados del checklist:**
  - Items que cumplen (verde)
  - Items que no cumplen (rojo)
  - Items no aplicables (gris)
  - Observaciones de cada item

- **Hallazgos detectados:**
  - Nivel de riesgo
  - Descripción
  - Fotos
  - Acciones correctivas asociadas

- **Acciones disponibles:**
  - Descargar PDF
  - Exportar a Excel
  - Crear acciones correctivas
  - Agregar comentarios

---

## 🚨 Gestionar Hallazgos

### Vista de Hallazgos

1. Ir a **"Hallazgos"**
2. Ver todos los hallazgos de la empresa

**Filtros útiles:**
- Nivel de riesgo
- Con/sin acción correctiva
- Estado de acción correctiva
- Sector
- Técnico que lo detectó
- Rango de fechas

### Estadísticas de Hallazgos

```
┌─────────────────────────────────────┐
│  Estadísticas de Hallazgos           │
├─────────────────────────────────────┤
│                                     │
│  Total este mes: 23                 │
│                                     │
│  Por nivel de riesgo:               │
│  🔴 Crítico:  2 (8%)                │
│  🟠 Alto:    12 (52%)               │
│  🟡 Medio:    8 (35%)               │
│  🟢 Bajo:     1 (5%)                │
│                                     │
│  Por estado de resolución:          │
│  ✅ Resueltos:       15 (65%)       │
│  🔄 En progreso:      5 (22%)       │
│  ⏰ Pendientes:       3 (13%)       │
│                                     │
│  Tiempo promedio de resolución:     │
│  7.5 días                           │
│                                     │
└─────────────────────────────────────┘
```

---

## ✅ Gestionar Acciones Correctivas

Las acciones correctivas son tareas asignadas para resolver hallazgos.

### Crear Acción Correctiva

1. Abrir un hallazgo
2. Hacer clic en **"Crear Acción Correctiva"**
3. Completar formulario:

```
┌─────────────────────────────────────┐
│  Nueva Acción Correctiva             │
├─────────────────────────────────────┤
│                                     │
│  Hallazgo vinculado:                │
│  "Piso mojado sin señalizar"        │
│  Nivel: Alto                        │
│                                     │
│  Descripción de la acción:          │
│  [Ej: "Instalar señalética de      │
│   piso mojado y capacitar al       │
│   personal de limpieza"]            │
│                                     │
│  Responsable:                       │
│  [Seleccionar usuario ▼]            │
│  o                                  │
│  [Texto libre: "Jefe de Planta"]    │
│                                     │
│  Fecha compromiso:                  │
│  [Seleccionar fecha]                │
│                                     │
│  Estado inicial:                    │
│  (•) Pendiente                      │
│  ( ) En progreso                    │
│                                     │
│  [Crear Acción]                     │
│                                     │
└─────────────────────────────────────┘
```

### Seguimiento de Acciones Correctivas

1. Ir a **"Acciones Correctivas"**
2. Ver dashboard de acciones:

```
┌─────────────────────────────────────┐
│  Acciones Correctivas                │
├─────────────────────────────────────┤
│                                     │
│  📊 Resumen                         │
│  ⏰ Pendientes:     8               │
│  🔄 En progreso:   12               │
│  ✅ Resueltas:     45               │
│  ⚠️  Vencidas:      3               │
│                                     │
│  Próximas a vencer (7 días):        │
│  ┌─────────────────────────────┐   │
│  │ Instalar señalética          │   │
│  │ Resp: Juan Pérez             │   │
│  │ Vence: 22/01/2025 (5 días)  │   │
│  │ [Ver] [Enviar recordatorio]  │   │
│  └─────────────────────────────┘   │
│                                     │
│  Vencidas:                          │
│  ┌─────────────────────────────┐   │
│  │ Reparar iluminación          │   │
│  │ Resp: María González         │   │
│  │ Venció: 15/01/2025 (hace 7d) │   │
│  │ [Ver] [Contactar]            │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### Actualizar Estado de Acción

1. Abrir acción correctiva
2. Cambiar estado según corresponda:
   - **Pendiente** → **En progreso**
   - **En progreso** → **Resuelta**
3. Si se marca como **Resuelta**:
   - Adjuntar evidencia (foto)
   - Agregar notas de cierre
   - Se registra automáticamente fecha de cierre

---

## 👥 Gestionar Usuarios

### Lista de Usuarios

1. Ir a **"Usuarios"**
2. Ver todos los usuarios de la empresa

```
┌─────────────────────────────────────┐
│  Usuarios                            │
│  [+ Nuevo Usuario]                   │
├─────────────────────────────────────┤
│                                     │
│  👤 Juan Pérez                      │
│  Rol: Técnico                       │
│  Email: juan@empresa.com            │
│  Último acceso: Hoy 14:30           │
│  [Editar] [Desactivar]              │
│  ────────────────────────────        │
│                                     │
│  👤 María González                  │
│  Rol: Supervisor                    │
│  Email: maria@empresa.com           │
│  Último acceso: Ayer 16:45          │
│  [Editar] [Desactivar]              │
│  ────────────────────────────        │
│                                     │
└─────────────────────────────────────┘
```

### Crear Nuevo Usuario

1. Hacer clic en **"+ Nuevo Usuario"**
2. Completar datos:
   - Nombre y apellido
   - Email (será su usuario)
   - Contraseña inicial
   - Rol: Admin / Supervisor / Técnico
3. El usuario recibirá un email de bienvenida

### Editar Usuario

Puedes modificar:
- Nombre, apellido, email
- Rol
- Estado (activo/inactivo)

**No puedes:**
- Ver contraseñas (están encriptadas)
- Editar inspecciones del usuario

### Roles y Permisos

| Permiso | Admin | Supervisor | Técnico |
|---------|-------|------------|---------|
| Realizar inspecciones | ✅ | ✅ | ✅ |
| Ver propias inspecciones | ✅ | ✅ | ✅ |
| Ver todas las inspecciones | ✅ | ✅ | ❌ |
| Crear/editar checklists | ✅ | ❌ | ❌ |
| Crear acciones correctivas | ✅ | ✅ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Ver dashboard completo | ✅ | ✅ | Limitado |
| Configurar empresa | ✅ | ❌ | ❌ |

---

## 🏢 Configurar Empresa

### Datos de la Empresa

1. Ir a **"Configuración"** → **"Empresa"**
2. Editar:
   - Nombre de la empresa
   - CUIT
   - Logo (aparece en reportes PDF)
   - Dirección
   - Teléfono

### Subir Logo

El logo aparecerá en:
- Reportes PDF
- Encabezado de la aplicación
- Emails automáticos

**Requisitos del logo:**
- Formato: PNG o JPG
- Tamaño máximo: 2 MB
- Dimensiones recomendadas: 400x100px
- Fondo transparente (recomendado para PNG)

---

## 📈 Reportes y Exportaciones

### Generar Reportes Consolidados

1. Ir a **"Reportes"**
2. Seleccionar tipo de reporte:

**Tipos disponibles:**

**A) Reporte de Inspecciones**
- Período: personalizable
- Formato: PDF / Excel
- Contenido:
  - Resumen ejecutivo
  - Listado de inspecciones
  - Estadísticas por sector
  - Gráficos de cumplimiento

**B) Reporte de Hallazgos**
- Agrupa hallazgos por:
  - Nivel de riesgo
  - Sector
  - Período
- Incluye fotos
- Estado de acciones correctivas

**C) Reporte de Acciones Correctivas**
- Acciones pendientes/vencidas
- Tiempo promedio de resolución
- Responsables con más acciones
- Eficiencia por responsable

**D) Reporte de KPIs**
- Indicadores clave de seguridad
- Tendencias mensuales
- Comparativas período anterior
- Gráficos ejecutivos

### Exportar Datos

Puedes exportar a Excel:
- Lista completa de inspecciones
- Lista de hallazgos
- Lista de acciones correctivas
- Historial de un sector específico

---

## 📊 KPIs Recomendados

### Indicadores de Seguridad

**1. Tasa de Cumplimiento**
```
(Items cumplidos / Total de items) × 100
Meta: > 90%
```

**2. Tiempo Promedio de Resolución**
```
Promedio de días entre hallazgo y cierre de AC
Meta: < 15 días
```

**3. Índice de Criticidad**
```
(Hallazgos críticos + altos) / Total hallazgos × 100
Meta: < 20%
```

**4. Frecuencia de Inspecciones**
```
Inspecciones realizadas / Inspecciones planificadas
Meta: 100%
```

**5. Reincidencia de Hallazgos**
```
Hallazgos repetidos en mismo sector / Total hallazgos
Meta: < 10%
```

---

## 🎯 Mejores Prácticas

### Para Checklists

1. **Revisión trimestral:** Actualiza checklists cada 3 meses
2. **Involucra a técnicos:** Pregúntales qué items agregar
3. **Piloto antes de lanzar:** Prueba con un técnico antes de activar
4. **Documentación:** Mantén un manual de cada checklist

### Para Acciones Correctivas

1. **Asigna responsables claros:** Persona específica, no "equipo"
2. **Fechas realistas:** Considera complejidad y recursos
3. **Seguimiento semanal:** Revisa acciones cada semana
4. **Escalación:** Define qué hacer con acciones vencidas
5. **Cierre con evidencia:** Siempre foto o documento de cierre

### Para Dashboard

1. **Revísalo diariamente:** Primero del día
2. **Comparte con gerencia:** Reporte semanal a directivos
3. **Identifica tendencias:** No solo números puntuales
4. **Acciona rápidamente:** Críticos en menos de 24hs

### Para Usuarios

1. **Capacitación inicial:** Entrena a todos antes de usar el sistema
2. **Soporte rápido:** Responde dudas de técnicos rápidamente
3. **Feedback regular:** Pregunta cómo mejorar el sistema
4. **Reconocimiento:** Destaca a técnicos que registran bien

---

## 📧 Notificaciones (Futuro)

En versiones futuras, el sistema enviará emails automáticos para:

- ✉️ Acción correctiva asignada
- ⚠️  Acción correctiva próxima a vencer (3 días antes)
- 🚨 Hallazgo crítico detectado
- 📊 Resumen semanal de métricas
- ✅ Acción correctiva cerrada

---

## 🔐 Seguridad y Privacidad

### Auditoría

Todas las acciones críticas quedan registradas:
- Creación/edición de checklists
- Creación de usuarios
- Cambios en configuración de empresa
- Acciones correctivas cerradas

Para ver auditoría:
1. Ir a **"Configuración"** → **"Auditoría"**
2. Filtrar por fecha, usuario, tipo de acción

### Backup de Datos

**Recomendaciones:**
- Backup automático diario de base de datos
- Backup semanal descargable en formato Excel
- Almacenar reportes PDF importantes fuera del sistema

### RGPD / Privacidad

El sistema SEH:
- ✅ Encripta todas las contraseñas
- ✅ Usa conexiones seguras (HTTPS)
- ✅ Permite exportar datos de usuario
- ✅ Permite eliminar usuario (soft delete)
- ✅ Registra consentimiento de tratamiento de datos

---

## ❓ Preguntas Frecuentes

**¿Puedo recuperar un checklist eliminado?**
No se pueden eliminar checklists usados en inspecciones. Solo desactivar.

**¿Cómo agrego más administradores?**
Crear usuario y asignar rol "Admin Empresa".

**¿Puedo cambiar el logo después?**
Sí, en cualquier momento. Los PDFs ya generados mantienen el logo anterior.

**¿Hay límite de usuarios?**
Depende de tu plan contratado. Contacta ventas para ampliar.

**¿Se pueden recuperar inspecciones borradas?**
Sí, durante 30 días. Luego se eliminan permanentemente.

---

## 🆘 Soporte Técnico

**Email:** soporte@seh.com
**Tel:** (011) 1234-5678
**Horario:** Lunes a Viernes, 9:00 - 18:00

**Soporte prioritario para administradores:** Respuesta en menos de 2 horas hábiles.

---

**¡Gracias por administrar SEH y contribuir a la seguridad de tu empresa!** 🛡️
