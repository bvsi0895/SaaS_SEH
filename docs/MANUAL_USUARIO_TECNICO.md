# 📱 Manual del Usuario Técnico - Sistema SEH

> Guía práctica para técnicos de seguridad e higiene que realizan inspecciones en planta

## 👋 Bienvenido

Este manual te enseñará a usar el sistema SEH para realizar inspecciones digitales, registrar hallazgos y generar reportes profesionales desde tu móvil o computadora.

---

## 🚀 Primeros Pasos

### 1. Acceder al Sistema

**Opción A: Aplicación Web (PWA)**
1. Abrir navegador (Chrome, Firefox, Edge)
2. Ir a: `https://seh.tuempresa.com`
3. Hacer clic en "Instalar App" si aparece el botón
4. La app se puede usar como una aplicación de escritorio

**Opción B: Aplicación Móvil**
1. Descargar "SEH Mobile" desde Play Store / App Store
2. O escanear QR proporcionado por tu supervisor

### 2. Iniciar Sesión

1. Ingresar tu **email** y **contraseña**
2. Hacer clic en "Iniciar Sesión"

**¿Olvidaste tu contraseña?**
- Hacer clic en "Recuperar contraseña"
- Ingresar tu email
- Revisar tu correo para instrucciones

### 3. Pantalla Principal

Al ingresar verás:

```
┌─────────────────────────────────────┐
│  🏠 Inicio                           │
├─────────────────────────────────────┤
│                                     │
│  📊 Resumen                         │
│  ┌──────────┐  ┌──────────┐        │
│  │    15    │  │    8     │        │
│  │Inspecciones│ │Hallazgos│        │
│  └──────────┘  └──────────┘        │
│                                     │
│  ⚡ Acciones Rápidas                │
│  [Nueva Inspección]                 │
│  [Ver Inspecciones]                 │
│  [Acciones Pendientes]              │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔍 Realizar una Inspección

### Paso 1: Iniciar Nueva Inspección

1. Hacer clic en **"Nueva Inspección"**
2. Completar datos iniciales:

```
┌─────────────────────────────────────┐
│  Nueva Inspección                    │
├─────────────────────────────────────┤
│                                     │
│  Checklist:                         │
│  [Seleccionar checklist ▼]          │
│                                     │
│  Sector/Área:                       │
│  [Escribir sector...]               │
│  Ej: "Línea de producción 2"       │
│                                     │
│  Descripción (opcional):            │
│  [Escribir descripción...]          │
│                                     │
│  📍 Ubicación:                      │
│  [Usar ubicación actual] ✓          │
│                                     │
│  [Iniciar Inspección]               │
│                                     │
└─────────────────────────────────────┘
```

3. Hacer clic en **"Iniciar Inspección"**

**💡 Tip:** Si estás sin internet, la app guardará la inspección localmente y se sincronizará cuando vuelvas a tener conexión.

### Paso 2: Completar el Checklist

Una vez iniciada la inspección, verás los items del checklist:

```
┌─────────────────────────────────────┐
│  Inspección en Progreso              │
│  Checklist: Orden y Limpieza         │
├─────────────────────────────────────┤
│                                     │
│  ✓ Completados: 3/15                │
│  ⏱️ Iniciada: 10:30 AM              │
│                                     │
│  Items:                             │
│                                     │
│  1. Pisos limpios y secos           │
│     [✓ Cumple] [✗ No cumple]       │
│     [➖ No aplica]                   │
│     Observaciones: ___________       │
│                                     │
│  2. Pasillos libres de obstáculos   │
│     [✓ Cumple] [✗ No cumple]       │
│     [➖ No aplica]                   │
│     Observaciones: ___________       │
│                                     │
│  [Item siguiente >]                 │
│  [Registrar Hallazgo]               │
│  [Finalizar Inspección]             │
│                                     │
└─────────────────────────────────────┘
```

**Para cada item:**
1. Observar la condición real
2. Marcar: **Cumple**, **No cumple**, o **No aplica**
3. Si es necesario, agregar **observaciones**
4. Si detectas un problema, hacer clic en **"Registrar Hallazgo"**

### Paso 3: Registrar Hallazgos

Cuando encuentres algo que no cumple o representa un riesgo:

```
┌─────────────────────────────────────┐
│  Registrar Hallazgo                  │
├─────────────────────────────────────┤
│                                     │
│  Título:                            │
│  [Ej: "Piso mojado sin señalizar"] │
│                                     │
│  Descripción:                       │
│  [Describir el hallazgo en detalle] │
│                                     │
│  Nivel de Riesgo:                   │
│  ( ) Bajo                           │
│  ( ) Medio                          │
│  (•) Alto                           │
│  ( ) Crítico                        │
│                                     │
│  📸 Fotos:                          │
│  [Tomar foto] [Galería]             │
│  [foto1.jpg] [x]                    │
│  [foto2.jpg] [x]                    │
│                                     │
│  📍 Ubicación:                      │
│  [Sector específico del hallazgo]   │
│                                     │
│  [Guardar Hallazgo]                 │
│                                     │
└─────────────────────────────────────┘
```

**🎯 Niveles de Riesgo - Guía:**

| Nivel | Cuándo usar | Ejemplo |
|-------|-------------|---------|
| **Crítico** | Peligro inminente de lesión grave o muerte | Maquinaria sin protección operando |
| **Alto** | Puede causar lesión grave en el corto plazo | Piso mojado en área de tránsito |
| **Medio** | Puede causar lesión leve o afectar salud | Iluminación deficiente |
| **Bajo** | No cumple norma pero riesgo menor | Cartel faltante |

**📸 Buenas Prácticas para Fotos:**
- Tomar fotos claras y con buena iluminación
- Capturar contexto (mostrar el área completa)
- Incluir detalle del problema
- Mínimo 2 fotos por hallazgo (general + detalle)

### Paso 4: Finalizar Inspección

Cuando completes todos los items:

1. Hacer clic en **"Finalizar Inspección"**
2. Revisar resumen:

```
┌─────────────────────────────────────┐
│  Resumen de Inspección               │
├─────────────────────────────────────┤
│                                     │
│  ✓ Items cumplidos:    12          │
│  ✗ Items no cumplen:    2          │
│  ➖ No aplica:          1          │
│                                     │
│  📋 Hallazgos: 2                    │
│  - 1 Alto                           │
│  - 1 Medio                          │
│                                     │
│  ⏱️ Duración: 45 minutos            │
│                                     │
│  [Confirmar y Finalizar]            │
│  [Volver a editar]                  │
│                                     │
└─────────────────────────────────────┘
```

3. Hacer clic en **"Confirmar y Finalizar"**

**✅ ¡Inspección completada!**

---

## 📄 Generar Reporte PDF

Después de finalizar una inspección, puedes generar el reporte profesional:

### Desde Móvil

1. Ir a **"Mis Inspecciones"**
2. Seleccionar la inspección
3. Hacer clic en **"Generar PDF"**
4. Opciones:
   - **Ver PDF**: Abre en navegador
   - **Compartir**: Enviar por WhatsApp, Email, etc.
   - **Descargar**: Guardar en el dispositivo

### Desde Web

1. Ir a **"Inspecciones"**
2. Hacer clic en el ícono de PDF (📄) de la inspección
3. El PDF se descarga automáticamente

**El reporte PDF incluye:**
- Logo de la empresa
- Datos del técnico
- Fecha y hora de la inspección
- Checklist completo con resultados
- Hallazgos con fotos
- Acciones correctivas generadas (si las hay)
- Firma digital

---

## 📊 Ver Mis Inspecciones

### Listar Inspecciones

1. Ir a **"Inspecciones"** en el menú
2. Ver lista de todas tus inspecciones

```
┌─────────────────────────────────────┐
│  Mis Inspecciones                    │
├─────────────────────────────────────┤
│                                     │
│  Filtros:                           │
│  [Todas ▼] [Últimos 7 días ▼]      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📋 Orden y Limpieza          │   │
│  │ Sector: Línea prod. 2        │   │
│  │ ✓ Completada                 │   │
│  │ 15/01/2025 10:30            │   │
│  │ 2 hallazgos                  │   │
│  │ [Ver] [PDF]                  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📋 EPP                       │   │
│  │ Sector: Almacén              │   │
│  │ ⏳ En progreso               │   │
│  │ 14/01/2025 14:00            │   │
│  │ [Continuar]                  │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### Filtros Disponibles

- **Estado**: Todas / En progreso / Completadas
- **Fecha**: Hoy / Últimos 7 días / Último mes / Personalizado
- **Checklist**: Por tipo de checklist
- **Sector**: Por área de la planta

---

## 🚨 Gestionar Hallazgos

### Ver Hallazgos

1. Ir a **"Hallazgos"** en el menú
2. Ver todos los hallazgos detectados

```
┌─────────────────────────────────────┐
│  Hallazgos Detectados                │
├─────────────────────────────────────┤
│                                     │
│  Filtros:                           │
│  [Nivel: Todos ▼] [Estado: Todos ▼]│
│                                     │
│  🔴 Alto - Piso mojado sin señalizar│
│  Inspección: Orden y Limpieza        │
│  Fecha: 15/01/2025                  │
│  Acción correctiva: Pendiente        │
│  [Ver detalles]                     │
│                                     │
│  🟡 Medio - Iluminación deficiente  │
│  Inspección: Seg. Eléctrica          │
│  Fecha: 14/01/2025                  │
│  Acción correctiva: En progreso      │
│  [Ver detalles]                     │
│                                     │
└─────────────────────────────────────┘
```

### Detalle de un Hallazgo

Al hacer clic en un hallazgo:

- Ver descripción completa
- Ver fotos adjuntas
- Ver ubicación
- Ver acciones correctivas asociadas
- Agregar comentarios (si tienes permiso)

---

## ✅ Acciones Correctivas

Como técnico, puedes:

### Ver Acciones Asignadas

1. Ir a **"Acciones Correctivas"**
2. Ver acciones que te fueron asignadas

```
┌─────────────────────────────────────┐
│  Mis Acciones Correctivas            │
├─────────────────────────────────────┤
│                                     │
│  ⏰ Pendientes: 3                   │
│  🔄 En progreso: 2                  │
│  ✅ Resueltas: 8                    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Instalar señalización        │   │
│  │ Hallazgo: Piso mojado...     │   │
│  │ Compromiso: 20/01/2025       │   │
│  │ Estado: Pendiente            │   │
│  │ [Actualizar]                 │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### Actualizar Estado de Acción

**Nota:** Dependiendo de los permisos de tu empresa, podrías o no poder actualizar directamente. Consulta con tu supervisor.

Si tienes permiso:

1. Abrir la acción correctiva
2. Cambiar estado:
   - **Pendiente** → **En progreso** (cuando la empiezas)
   - **En progreso** → **Resuelta** (cuando la completas)
3. Al marcar como resuelta:
   - Adjuntar foto de evidencia
   - Agregar notas de cierre

---

## 💾 Trabajo Offline (Sin Internet)

### ¿Cómo funciona?

La aplicación puede funcionar **sin conexión a internet**:

1. **Datos disponibles offline:**
   - Tus inspecciones recientes
   - Checklists que ya descargaste
   - Hallazgos registrados

2. **Lo que puedes hacer offline:**
   - ✅ Crear nuevas inspecciones
   - ✅ Completar checklists
   - ✅ Registrar hallazgos
   - ✅ Tomar fotos
   - ✅ Agregar observaciones

3. **Sincronización automática:**
   - Cuando vuelvas a tener internet
   - Los datos se sincronizarán automáticamente
   - Verás un indicador de sincronización

```
┌─────────────────────────────────────┐
│  ⚡ Sincronizando...                 │
│                                     │
│  Subiendo 2 inspecciones            │
│  Subiendo 5 fotos                   │
│                                     │
│  [■■■■■■■□□□] 70%                   │
│                                     │
└─────────────────────────────────────┘
```

**💡 Tip:** Antes de ir a campo sin internet, abre la app con conexión para que descargue los checklists necesarios.

---

## 👤 Configurar tu Perfil

### Actualizar Datos Personales

1. Ir a **"Perfil"** (ícono de usuario)
2. Editar:
   - Nombre y apellido
   - Email
   - Teléfono
   - Foto de perfil

### Cambiar Contraseña

1. Ir a **"Perfil"** → **"Seguridad"**
2. Hacer clic en **"Cambiar contraseña"**
3. Ingresar:
   - Contraseña actual
   - Nueva contraseña
   - Confirmar nueva contraseña
4. Hacer clic en **"Actualizar"**

**Requisitos de contraseña:**
- Mínimo 8 caracteres
- Al menos 1 mayúscula
- Al menos 1 número
- Al menos 1 carácter especial

---

## ❓ Preguntas Frecuentes

### ¿Puedo editar una inspección ya finalizada?

No. Una vez finalizada, la inspección queda bloqueada. Si necesitas hacer correcciones, contacta a tu supervisor.

### ¿Qué hago si encuentro un riesgo crítico?

1. **Detener la inspección**
2. **Alejar a personas del área**
3. **Avisar a tu supervisor inmediatamente**
4. **Registrar el hallazgo como "Crítico"**
5. **Tomar fotos del riesgo**

### ¿Las fotos ocupan mucho espacio?

Las fotos se comprimen automáticamente para optimizar el almacenamiento. Una inspección típica con 10 fotos ocupa aproximadamente 5-10 MB.

### ¿Puedo usar la app en tablet?

Sí, la app funciona perfectamente en tablets Android o iPad.

### ¿Necesito estar conectado a internet todo el tiempo?

No. La app funciona offline y sincroniza cuando hay conexión.

### ¿Cómo descargo todas mis inspecciones?

1. Ir a **"Inspecciones"**
2. Hacer clic en **"Exportar"**
3. Seleccionar formato (Excel / PDF)
4. Seleccionar rango de fechas
5. Hacer clic en **"Descargar"**

---

## 🆘 Soporte y Ayuda

### Si tienes problemas técnicos:

1. **Verificar conexión a internet**
2. **Cerrar y volver a abrir la app**
3. **Actualizar a la última versión**

### Contactar soporte:

**Email:** soporte@seh.com
**Teléfono:** (011) 1234-5678
**Horario:** Lunes a Viernes, 9:00 - 18:00

---

## 📌 Tips para Mejores Inspecciones

1. ✅ **Sé detallista:** Observa bien antes de marcar un item
2. 📸 **Toma buenas fotos:** Claras, con contexto y detalle
3. 📝 **Usa observaciones:** Agrega contexto útil
4. ⏱️ **No te apures:** Una inspección bien hecha previene accidentes
5. 🔄 **Sincroniza frecuentemente:** Si tienes internet, sincroniza regularmente
6. 🔋 **Carga tu dispositivo:** Lleva batería suficiente para el día
7. 📱 **Actualiza la app:** Mantén la app actualizada para las últimas mejoras

---

**¡Gracias por usar SEH y contribuir a un ambiente de trabajo más seguro!** 🛡️
