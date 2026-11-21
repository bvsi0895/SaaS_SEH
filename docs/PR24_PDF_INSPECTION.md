# PR #24 — Corrección definitiva del PDF de inspecciones

## Causa técnica

- Los datos generales se dibujaban usando `doc.y` después de cada llamada a `text`. PDFKit actualiza esa coordenada según el último texto, por lo que la segunda columna comenzaba debajo de la etiqueta en lugar de comenzar en la misma fila.
- `sectionTitle` no fijaba `x` ni `align`, y heredaba la posición horizontal de la última celda del checklist. Por eso `HALLAZGOS DETECTADOS` podía aparecer corrido hacia la derecha.
- La altura del checklist se medía antes de fijar la fuente y el tamaño definitivos de cada columna. Las filas largas quedaban subdimensionadas y el texto podía invadir la columna Estado.
- Prisma entrega `checklistItem.descripcion` como texto Unicode y `reportes.service.ts` no lo recodifica. La normalización del generador sólo repara mojibake inequívoco (`Ã`, `Â`, `â`) cuando la conversión reduce esos marcadores; el texto válido (`¿`, `¡`, `ñ`, tildes) se conserva. La reproducción local con las ocho preguntas muestra que PDFKit/WinAnsi representa correctamente esos caracteres. Por tanto, valores como `›ôÆ÷` deben investigarse en el dato almacenado o en el cliente que lo insertó; PR #24 no modifica datos históricos ni aplica conversiones indiscriminadas.

## Corrección

- Filas de datos generales con `x`/`y` explícitos, alturas calculadas por el contenido y saltos de página seguros.
- Encabezados con `x`, ancho y alineación izquierda explícitos.
- Checklist con anchos constantes, medición por celda usando la fuente final, altura de fila igual a la celda más alta y encabezado repetido en páginas nuevas.
- Se conservan logo, fotografías autorizadas, estado/resolución de hallazgos, páginas de continuación y numeración.

## Verificación visual

El fixture de `Oficinas Centro` contiene ocho preguntas con signos de apertura, `ñ`, tildes y texto largo, además de logo, fotografía, hallazgo solucionado y resolución. Se renderizaron todas sus páginas a PNG y se revisaron visualmente.
